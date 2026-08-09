"""
FedCare AI Hospital Node - Main Entry Point
"""
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core import settings
from app.api.v1.router import api_router
from app.middleware.logging_middleware import LoggingMiddleware
from app.middleware.error_handler import ErrorHandlerMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("fedcare-hospital")


async def init_local_db():
    """Create local database tables on startup."""
    # Ensure directories exist
    os.makedirs(settings.FEDCARE_HOME, exist_ok=True)
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    os.makedirs(settings.MODELS_DIR, exist_ok=True)

    from app.db.session import engine
    from app.models.base import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("[OK] Hospital local database tables created.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events."""
    logger.info("🚀 Starting FedCare AI Hospital Node...")

    # Ensure local directories exist
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    os.makedirs(settings.MODELS_DIR, exist_ok=True)

    # Initialize local SQLite database
    try:
        await init_local_db()
        logger.info("✅ Hospital database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Hospital database initialization failed: {e}")

    yield

    logger.info("👋 Shutting down FedCare AI Hospital Node...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Hospital-local training and inference endpoint for federated learning",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)
app.add_middleware(ErrorHandlerMiddleware)

# Include API routes
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/v1/health",
        "message": "Welcome to FedCare AI Hospital Node",
    }
