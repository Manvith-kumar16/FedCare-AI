from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.core.security import verify_password
from app.models.user import User, UserRole
from app.models.hospital import Hospital
from app.schemas.auth import LoginRequest, LoginResponse, HospitalInfo
from app.schemas.user import UserResponse
from app.middleware.logging_middleware import logger

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=LoginResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    PERMISSIVE LOGIN FOR DEMO (Accepts any password)
    """
    # 1. Permissive Auth: Find user by email, or use first hospital as fallback
    logger.info(f"🔑 AUTH BYPASS: Login attempt for '{data.email}'")
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        logger.info(f"ℹ️ User '{data.email}' not found, falling back to first hospital account")
        fallback_result = await db.execute(select(User).where(User.role == UserRole.HOSPITAL))
        user = fallback_result.scalars().first()
        
    if not user:
        logger.error("❌ CRITICAL: No hospital users found in database for fallback")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="System error: No users available",
        )
    
    # 2. Skip password verification (Demo Mode)
    logger.info(f"✅ Bypassing password check for '{user.email}'")
    
    # 3. Find hospital details
    hospital_info = None
    hosp_result = await db.execute(select(Hospital).where(Hospital.user_id == user.id))
    hospital = hosp_result.scalar_one_or_none()
    if hospital:
        hospital_info = HospitalInfo(
            id=hospital.id,
            name=hospital.name,
            location=hospital.location
        )

    logger.info(f"🎉 Demo login successful: '{user.email}'")
    return LoginResponse(
        user=UserResponse.model_validate(user),
        hospital=hospital_info,
        access_token=f"demo-token-{user.id}"
    )



