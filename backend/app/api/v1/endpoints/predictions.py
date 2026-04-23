"""Prediction endpoints"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db import get_db
from app.models import DiseaseServer, Prediction
from app.schemas.prediction import PredictionInput, PredictionResponse, ExplanationResponse
from app.services.ai_service import load_model, predict_single
from app.services.xai_service import generate_shap_explanation, generate_global_feature_importance

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.post("/predict", response_model=PredictionResponse)
async def make_prediction(data: PredictionInput, db: AsyncSession = Depends(get_db)):
    """Make a diabetes prediction with the federated model."""
    # Check server exists
    result = await db.execute(select(DiseaseServer).where(DiseaseServer.id == data.server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Load model
    model = load_model(data.server_id)
    if model is None:
        raise HTTPException(status_code=400, detail="No trained model found. Please run training first.")
        
    feature_columns = json.loads(server.feature_columns) if server.feature_columns else []
    
    # Filter features based on what was parsed from dataset
    features = { col: float(data.features.get(col, 0.0)) for col in feature_columns }

    # Make prediction
    pred_result = predict_single(model, features, feature_columns)

    # Generate SHAP explanation
    try:
        explanation = generate_shap_explanation(data.server_id, features, feature_columns)
        explanation_json = json.dumps(explanation.get("shap_values", {}))
        importance_json = json.dumps(explanation.get("feature_importance", []))
    except Exception as e:
        explanation_json = "{}"
        importance_json = "[]"
        print(f"SHAP explanation error: {e}")

    # Save prediction to DB
    prediction = Prediction(
        server_id=data.server_id,
        input_data=json.dumps(features),
        prediction=pred_result["prediction"],
        prediction_label=pred_result["prediction_label"],
        confidence=pred_result["confidence"],
        probability_positive=pred_result["probability_positive"],
        probability_negative=pred_result["probability_negative"],
        explanation_data=explanation_json,
        feature_importance=importance_json,
    )
    db.add(prediction)
    await db.commit()
    await db.refresh(prediction)

    return PredictionResponse(
        id=prediction.id,
        server_id=prediction.server_id,
        prediction=prediction.prediction,
        prediction_label=prediction.prediction_label,
        confidence=prediction.confidence,
        probability_positive=prediction.probability_positive,
        probability_negative=prediction.probability_negative,
        input_data=prediction.input_data,
        explanation_data=prediction.explanation_data,
        feature_importance=prediction.feature_importance,
        created_at=prediction.created_at,
    )


@router.get("/history/{server_id}", response_model=List[PredictionResponse])
async def get_prediction_history(server_id: int, limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Get prediction history for a server."""
    result = await db.execute(
        select(Prediction)
        .where(Prediction.server_id == server_id)
        .order_by(Prediction.created_at.desc())
        .limit(limit)
    )
    predictions = result.scalars().all()

    return [
        PredictionResponse(
            id=p.id,
            server_id=p.server_id,
            prediction=p.prediction,
            prediction_label=p.prediction_label,
            confidence=p.confidence,
            probability_positive=p.probability_positive,
            probability_negative=p.probability_negative,
            input_data=p.input_data,
            explanation_data=p.explanation_data,
            feature_importance=p.feature_importance,
            created_at=p.created_at,
        )
        for p in predictions
    ]


@router.get("/explain/{prediction_id}", response_model=ExplanationResponse)
async def get_explanation(prediction_id: int, db: AsyncSession = Depends(get_db)):
    """Get SHAP explanation for a specific prediction."""
    result = await db.execute(select(Prediction).where(Prediction.id == prediction_id))
    prediction = result.scalar_one_or_none()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    # Re-generate SHAP explanation
    result_server = await db.execute(select(DiseaseServer).where(DiseaseServer.id == prediction.server_id))
    server = result_server.scalar_one_or_none()
    feature_columns = json.loads(server.feature_columns) if server and server.feature_columns else []

    input_data = json.loads(prediction.input_data)
    explanation = generate_shap_explanation(prediction.server_id, input_data, feature_columns)

    if "error" in explanation:
        raise HTTPException(status_code=500, detail=explanation["error"])

    return ExplanationResponse(
        prediction_id=prediction.id,
        prediction_label=prediction.prediction_label,
        confidence=prediction.confidence,
        shap_values=explanation.get("shap_values", {}),
        feature_importance=explanation.get("feature_importance", []),
        base_value=explanation.get("base_value", 0),
        plot_base64=explanation.get("plot_base64"),
    )


@router.get("/feature-importance/{server_id}")
async def get_feature_importance(server_id: int, db: AsyncSession = Depends(get_db)):
    """Get global feature importance for a server's model."""
    result_server = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = result_server.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
        
    feature_columns = json.loads(server.feature_columns) if server.feature_columns else []
    
    result = generate_global_feature_importance(server_id, feature_columns)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
