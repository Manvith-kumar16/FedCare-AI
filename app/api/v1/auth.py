from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate, UserRead
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/auth/register", response_model=UserRead)
async def register(payload: UserCreate, session: AsyncSession = Depends(get_session)):
    svc = AuthService(session)
    existing = await svc.users.get_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await svc.register(payload.name, payload.email, payload.password, payload.role)
    return user


@router.post("/auth/login", response_model=Token)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_session)):
    svc = AuthService(session)
    user = await svc.authenticate(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    tokens = svc.create_tokens(user)
    return {"access_token": tokens["access_token"], "refresh_token": tokens["refresh_token"]}


@router.post("/auth/refresh", response_model=Token)
async def refresh(token: dict, session: AsyncSession = Depends(get_session)):
    # expects {"refresh_token": "..."}
    svc = AuthService(session)
    if "refresh_token" not in token:
        raise HTTPException(status_code=400, detail="refresh_token required")
    try:
        tokens = svc.refresh(token["refresh_token"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    return {"access_token": tokens["access_token"], "refresh_token": tokens["refresh_token"]}
