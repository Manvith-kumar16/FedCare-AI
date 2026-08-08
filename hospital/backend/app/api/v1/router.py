"""API v1 Router - aggregates all hospital local endpoint routers"""
from fastapi import APIRouter
from app.api.v1.endpoints import health, datasets, training, predictions, explainability, auth, servers

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(servers.router)
api_router.include_router(datasets.router)
api_router.include_router(training.router)
api_router.include_router(predictions.router)
api_router.include_router(explainability.router)
