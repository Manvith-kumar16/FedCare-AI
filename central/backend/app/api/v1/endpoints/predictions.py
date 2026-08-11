"""Prediction endpoints (public user global model)"""
from fastapi import APIRouter, Depends, HTTPException
import json
from app.schemas.prediction import PredictionInput, PredictionResponse
from app.services.ai_service import load_global_model, predict_single
from app.api.deps import get_current_user
from app.models.user import User
from app.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.disease_server import DiseaseServer

router = APIRouter(prefix="/predictions", tags=["Predictions"])

@router.post("/predict", response_model=PredictionResponse)
async def make_prediction(
    data: PredictionInput,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Make a prediction using the global model.
    """
    server_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == data.server_id))
    server = server_res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    model = load_global_model(data.server_id)
    if not model:
        raise HTTPException(status_code=400, detail="Global model not available for this server yet.")

    features = data.features
    feature_columns = []
    
    try:
        feature_columns = json.loads(server.schema_json)
    except Exception:
        raise HTTPException(status_code=500, detail="Server schema is invalid")

    try:
        pred_result = predict_single(model, features, feature_columns)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    return PredictionResponse(
        prediction=pred_result["prediction"],
        prediction_label=pred_result["prediction_label"],
        confidence=pred_result["confidence"],
        probability_positive=pred_result["probability_positive"],
        probability_negative=pred_result["probability_negative"]
    )
