"""FedCare AI Hospital - Configuration Settings"""
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    APP_NAME: str = "FedCare AI Hospital Node"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./hospital.db"
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "fedcare-ai-hospital-node-super-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    HOSPITAL_ID: int = int(os.getenv("HOSPITAL_ID", "1"))
    CENTRAL_API_URL: str = os.getenv("CENTRAL_API_URL", "http://localhost:8000")
    FL_LOCAL_EPOCHS: int = int(os.getenv("FL_LOCAL_EPOCHS", "10"))

    CORS_ORIGINS: list[str] = [
        "http://localhost:5174",
        "http://localhost:3000",
    ]

    # Local directories
    DATA_DIR: str = os.getenv(
        "DATA_DIR",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    )
    MODELS_DIR: str = os.getenv(
        "MODELS_DIR",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "saved_models")
    )

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
