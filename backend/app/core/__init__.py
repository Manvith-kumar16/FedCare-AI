"""FedCare AI - Core Configuration"""
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    APP_NAME: str = "FedCare AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:root@localhost:5432/fedcare_ai"
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "fedcare-ai-super-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # Data directories
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    MODELS_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "saved_models")

    # FL settings
    FL_NUM_ROUNDS: int = 5
    FL_LOCAL_EPOCHS: int = 10

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
