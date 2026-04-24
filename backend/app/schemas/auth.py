from typing import Optional
from pydantic import BaseModel, EmailStr
from app.schemas.user import UserResponse
from app.models.user import UserRole

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.HOSPITAL
    # Optional hospital details
    hospital_name: Optional[str] = None
    location: Optional[str] = None

class HospitalInfo(BaseModel):
    id: int
    name: str
    location: Optional[str] = None

class LoginResponse(BaseModel):
    user: UserResponse
    hospital: Optional[HospitalInfo] = None
    token_type: str = "bearer"
    access_token: str
