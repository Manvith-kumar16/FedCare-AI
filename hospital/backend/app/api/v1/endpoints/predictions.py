"""Prediction endpoints (hospital local)"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db import get_db
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionInput, PredictionResponse, ExplanationResponse
from app.services.ai_service import load_local_model, load_global_model, predict_single
from app.services.xai_service import generate_shap_explanation, generate_local_feature_importance
from app.api.deps import get_current_hospital_user

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.post("/predict", response_model=PredictionResponse)
async def make_prediction(
    data: PredictionInput,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_hospital_user)
):
    """
    Run real inference locally on the hospital node.
    Loads local or global model from disk.
    """
    hospital_id = current_user["hospital_id"]

    # 1. Load model (local first, fallback to global)
    model = load_local_model(data.server_id, hospital_id)
    if model is None:
        model = load_global_model(data.server_id)
        
    if model is None:
        raise HTTPException(
            status_code=400,
            detail="No trained local model or global model found on this node. Please sync/train first."
        )

    # 2. Extract feature columns from model
    if hasattr(model, "feature_names_in_") and model.feature_names_in_ is not None:
        feature_columns = list(model.feature_names_in_)
    else:
        # fallback mapping
        feature_columns = list(data.features.keys())

    # Build features dict matching model structure
    features = {col: float(data.features.get(col, 0.0)) for col in feature_columns}

    # 3. Run prediction
    pred_result = predict_single(model, features, feature_columns)

    # 4. Generate SHAP explanation locally
    explanation_json = "{}"
    importance_json = "[]"
    try:
        explanation = generate_shap_explanation(data.server_id, hospital_id, features, feature_columns)
        if "error" not in explanation:
            explanation_json = json.dumps(explanation.get("shap_values", {}))
            importance_json = json.dumps(explanation.get("feature_importance", []))
    except Exception as e:
        print(f"[local-predict] SHAP generation failed: {e}")

    # 5. Persist prediction log in hospital local db
    record = Prediction(
        server_id=data.server_id,
        input_data=json.dumps(features),
        prediction=pred_result["prediction"],
        prediction_label=pred_result["prediction_label"],
        confidence=pred_result["confidence"],
        probability_positive=pred_result["probability_positive"],
        probability_negative=pred_result["probability_negative"],
        explanation_data=explanation_json,
        feature_importance=importance_json
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return PredictionResponse(
        id=record.id,
        server_id=record.server_id,
        prediction=record.prediction,
        prediction_label=record.prediction_label,
        confidence=record.confidence,
        probability_positive=record.probability_positive,
        probability_negative=record.probability_negative,
        input_data=record.input_data,
        explanation_data=record.explanation_data,
        feature_importance=record.feature_importance,
        created_at=record.created_at
    )


@router.get("/history/{server_id}", response_model=List[PredictionResponse])
async def get_prediction_history(
    server_id: int,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_hospital_user)
):
    """Get recent predictions history from the local database."""
    result = await db.execute(
        select(Prediction)
        .where(Prediction.server_id == server_id)
        .order_by(Prediction.created_at.desc())
        .limit(limit)
    )
    predictions = result.scalars().all()
    return predictions
