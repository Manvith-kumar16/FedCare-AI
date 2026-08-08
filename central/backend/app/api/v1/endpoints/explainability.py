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
from app.models.disease_server import DiseaseServer
from app.models.model_version import ModelVersion
from app.api.deps import get_current_active_admin
from app.services.fl_coordinator import FederatedEnsembleClassifier
from sklearn.linear_model import LogisticRegression

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
        with open(model_version.model_path, "rb") as f:
            model = pickle.load(f)
            
        ranking = []
        
        # XGBoost Federated Ensemble
        if hasattr(model, "models") and hasattr(model, "weights"):
            # We average the feature importances of the underlying sub-models in the ensemble
            total_imp = np.zeros_like(model.models[0].feature_importances_)
            for sub_model, w in zip(model.models, model.weights):
                total_imp += sub_model.feature_importances_ * w
                
            # Pair with features
            features = model.feature_names_in_.tolist() if hasattr(model, "feature_names_in_") else [f"feature_{i}" for i in range(len(total_imp))]
            
            # Normalize to sum to 1
            if total_imp.sum() > 0:
                total_imp = total_imp / total_imp.sum()
                
            for feat, val in zip(features, total_imp):
                ranking.append({
                    "feature": feat,
                    "importance": float(val)
                })
                
        # Logistic Regression
        elif isinstance(model, LogisticRegression):
            coef = np.abs(model.coef_[0])
            features = model.feature_names_in_.tolist() if hasattr(model, "feature_names_in_") else [f"feature_{i}" for i in range(len(coef))]
            
            # Normalize to sum to 1
            if coef.sum() > 0:
                coef = coef / coef.sum()
                
            for feat, val in zip(features, coef):
                ranking.append({
                    "feature": feat,
                    "importance": float(val)
                })
        
        # Sort ranking by importance descending
        ranking.sort(key=lambda x: x["importance"], reverse=True)
        
        return {
            "server_id": server_id,
            "model_type": server.model_type.value,
            "feature_ranking": ranking
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract global feature importance: {str(e)}"
        )
