from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings
from app.api.v1 import auth, users, hospitals, health
from app.middleware.logging import setup_logging


def create_app() -> FastAPI:
    setup_logging()
    app = FastAPI(title="FedCare AI", version="1.0.0")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API routers
    app.include_router(auth.router, prefix=f"/api/{settings.API_V1_STR}")
    app.include_router(users.router, prefix=f"/api/{settings.API_V1_STR}")
    app.include_router(hospitals.router, prefix=f"/api/{settings.API_V1_STR}")
    app.include_router(health.router, prefix=f"/api/{settings.API_V1_STR}")

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"detail": exc.errors()})

    return app


app = create_app()
