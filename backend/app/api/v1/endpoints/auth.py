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
    Authenticate a user and return user info + hospital info if applicable.
    """
    # 1. Find user by email
    logger.info(f"🔑 Login attempt: email='{data.email}' role_toggle='[Not Sent]'")
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        logger.warning(f"❌ User not found: '{data.email}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    # 2. Verify password
    is_valid = verify_password(data.password, user.password_hash)
    if not is_valid:
        logger.warning(f"❌ Password mismatch for: '{data.email}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    if not user.is_active:
        logger.warning(f"⚠️ Inactive user: '{data.email}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    
    # 3. If hospital role, find hospital details
    hospital_info = None
    if user.role == UserRole.HOSPITAL:
        hosp_result = await db.execute(select(Hospital).where(Hospital.user_id == user.id))
        hospital = hosp_result.scalar_one_or_none()
        if hospital:
            hospital_info = HospitalInfo(
                id=hospital.id,
                name=hospital.name,
                location=hospital.location
            )

    logger.info(f"✅ Login successful: '{user.email}' (role={user.role})")
    return LoginResponse(
        user=UserResponse.model_validate(user),
        hospital=hospital_info,
        access_token=f"token-{user.id}-{user.role.lower()}" # Mock for now
    )

