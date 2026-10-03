"""
Global Explainability Endpoints (central coordinator)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import pickle
import numpy as np
import os
from typing import List
from app.db import get_db
from app.models.user import User
from app.models.disease_server import DiseaseServer, ModelType
from app.models.model_version import ModelVersion
from app.api.deps import get_current_active_admin, get_current_user

router = APIRouter(prefix="/explainability", tags=["Explainability"])

@router.get("/feature-importance/{server_id}", response_model=dict)
async def get_global_feature_importance(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    """
    Load active global model and compute relative feature importances (Admin only).
    """
    # 1. Check server
    srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = srv_res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Disease server not found")

    # 2. Get active model version
    v_res = await db.execute(
        select(ModelVersion).where(
            ModelVersion.server_id == server_id,
            ModelVersion.is_active == True
        ).order_by(ModelVersion.round_number.desc())
    )
    model_version = v_res.scalars().first()
    if not model_version or not os.path.exists(model_version.model_path):
        return {
            "server_id": server_id,
            "model_type": server.model_type.value,
            "feature_ranking": []
        }

    # 3. Load model and extract feature importances
    try:
        # Currently, global feature importance ranking is not supported for CNNs
        return {
            "server_id": server_id,
            "model_type": server.model_type.value,
            "feature_ranking": []
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract global feature importance: {str(e)}"
        )

from app.schemas.prediction import PredictionInput, ExplanationResponse
from app.services.xai_service import generate_shap_explanation
import json

@router.post("/explain/{server_id}", response_model=ExplanationResponse)
async def explain_prediction(
    server_id: int,
    data: PredictionInput,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Generate local SHAP explanation for a prediction on the global model.
    """
    # 1. Check server
    srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = srv_res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Disease server not found")

    try:
        if server.feature_columns is None:
            raise ValueError("Feature columns are not set.")
        feature_columns = json.loads(server.feature_columns)
    except Exception:
        raise HTTPException(status_code=500, detail="Server schema is invalid or not yet initialized.")

    explanation = generate_shap_explanation(server_id, data.features, feature_columns)
    
    if "error" in explanation:
        raise HTTPException(status_code=500, detail=explanation["error"])
        
    return ExplanationResponse(
        prediction_id=0,
        prediction_label="Prediction",
        confidence=1.0,
        feature_names=[item["feature"] for item in explanation["feature_importance"]],
        shap_values=[item["shap_value"] for item in explanation["feature_importance"]],
        base_value=explanation.get("base_value", 0.0),
        plot_base64=explanation.get("plot_base64")
    )
