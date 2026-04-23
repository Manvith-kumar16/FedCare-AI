from typing import Optional
from pydantic import BaseModel, EmailStr
from app.schemas.user import UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class HospitalInfo(BaseModel):
    id: int
    name: str
    location: Optional[str] = None

class LoginResponse(BaseModel):
    user: UserResponse
    hospital: Optional[HospitalInfo] = None
    token_type: str = "bearer"
    access_token: str = "mock-persistent-token" # Keeping it simple for session persistence without full JWT yet
