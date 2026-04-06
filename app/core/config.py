from typing import List
from pydantic import BaseSettings, AnyUrl


class Settings(BaseSettings):
    APP_NAME: str = "FedCare AI"
    API_V1_STR: str = "v1"

    # DB
    DATABASE_URL: str

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"


settings = Settings()
