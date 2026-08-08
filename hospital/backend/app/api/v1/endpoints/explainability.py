"""Explainability endpoints (hospital local)"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models.prediction import Prediction
from app.schemas.prediction import ExplanationResponse
from app.services.xai_service import generate_shap_explanation, generate_local_feature_importance
from app.api.deps import get_current_hospital_user

router = APIRouter(prefix="/explainability", tags=["Explainability"])


@router.get("/explain/{prediction_id}", response_model=ExplanationResponse)
async def explain_prediction(
    prediction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_hospital_user)
):
    """Re-generate local SHAP explanation for a prediction."""
    hospital_id = current_user["hospital_id"]
    pred_res = await db.execute(select(Prediction).where(Prediction.id == prediction_id))
    prediction = pred_res.scalar_one_or_none()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found in local node")

    # Reconstruct input features
    features = json.loads(prediction.input_data or "{}")
    feature_columns = list(features.keys())

    # Generate SHAP values
    explanation = generate_shap_explanation(prediction.server_id, hospital_id, features, feature_columns)
    
    if "error" in explanation:
        raise HTTPException(status_code=500, detail=explanation["error"])

    return ExplanationResponse(
        prediction_id=prediction.id,
        prediction_label=prediction.prediction_label,
        confidence=prediction.confidence,
        shap_values=explanation.get("shap_values", {}),
        feature_importance=explanation.get("feature_importance", []),
        base_value=explanation.get("base_value", 0.0),
        plot_base64=explanation.get("plot_base64")
    )


@router.get("/feature-importance/{server_id}")
async def get_feature_importance(
    server_id: int,
    current_user: dict = Depends(get_current_hospital_user)
):
    """Return local feature importance ranking."""
    hospital_id = current_user["hospital_id"]
    # We fetch feature columns from local configurations
    # Simple default columns for features
    feature_columns = [
        "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
        "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"
    ]
    
    result = generate_local_feature_importance(server_id, hospital_id, feature_columns)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result
