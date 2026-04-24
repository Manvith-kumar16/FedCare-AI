from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.models.hospital import Hospital
from app.schemas.auth import LoginRequest, LoginResponse, HospitalInfo, RegisterRequest
from app.schemas.user import UserResponse
from app.middleware.logging_middleware import logger
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user (Admin or Hospital).
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create User
    new_user = User(
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=data.role
    )
    db.add(new_user)
    await db.flush() # Get user ID
    
    # If Hospital role, create Hospital record
    if data.role == UserRole.HOSPITAL:
        new_hospital = Hospital(
            user_id=new_user.id,
            name=data.hospital_name or data.name,
            location=data.location
        )
        db.add(new_hospital)
    
    await db.commit()
    await db.refresh(new_user)
    logger.info(f"🆕 Registered new user: {new_user.email} ({new_user.role})")
    return new_user

@router.post("/login", response_model=LoginResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user and return JWT token.
    """
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.password_hash):
        logger.warning(f"❌ Failed login attempt for '{data.email}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    # Find hospital details
    hospital_info = None
    hosp_result = await db.execute(select(Hospital).where(Hospital.user_id == user.id))
    hospital = hosp_result.scalar_one_or_none()
    if hospital:
        hospital_info = HospitalInfo(
            id=hospital.id,
            name=hospital.name,
            location=hospital.location
        )

    access_token = create_access_token(subject=user.id)
    logger.info(f"🔑 User logged in: '{user.email}'")
    
    return LoginResponse(
        user=UserResponse.model_validate(user),
        hospital=hospital_info,
        access_token=access_token
    )

@router.get("/me", response_model=LoginResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user details and hospital info.
    """
    hospital_info = None
    hosp_result = await db.execute(select(Hospital).where(Hospital.user_id == current_user.id))
    hospital = hosp_result.scalar_one_or_none()
    if hospital:
        hospital_info = HospitalInfo(
            id=hospital.id,
            name=hospital.name,
            location=hospital.location
        )
    
    return LoginResponse(
        user=UserResponse.model_validate(current_user),
        hospital=hospital_info,
        access_token="already-authenticated" # Token is already validated by get_current_user
    )



