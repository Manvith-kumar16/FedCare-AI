"""API v1 Router - aggregates all endpoint routers"""
from fastapi import APIRouter
from app.api.v1.endpoints import health, servers, datasets, training, predictions

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(servers.router)
api_router.include_router(datasets.router)
api_router.include_router(training.router)
api_router.include_router(predictions.router)
