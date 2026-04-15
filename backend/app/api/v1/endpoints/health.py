"""Health check endpoint"""
from fastapi import APIRouter
from app.core import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/info")
async def app_info():
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "Federated Learning Platform for Privacy-Preserving Healthcare AI",
        "features": [
            "Multi-tenant Disease Servers",
            "XGBoost Tabular Training",
            "Federated Learning (FedAvg)",
            "Explainable AI (SHAP)",
            "Privacy-Preserving Design",
        ],
    }
