"""
FedCare AI Hospital Node - Authentication Proxy Endpoints
"""
import urllib.request
import urllib.error
import json
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core import settings
from app.api.deps import get_current_hospital_user

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    hospital_name: Optional[str] = None
    location: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

class HospitalInfo(BaseModel):
    id: int
    name: str
    location: Optional[str] = None

class LoginResponse(BaseModel):
    user: UserResponse
    hospital: Optional[HospitalInfo] = None
    token_type: str = "bearer"
    access_token: str

@router.post("/register", response_model=UserResponse)
async def register(data: RegisterRequest):
    """
    Register via the Central Coordinator authentication endpoint.
    This maintains the proxy architecture required for local-only communication.
    """
    url = f"{settings.CENTRAL_API_URL}/api/v1/auth/register"
    register_data = json.dumps({
        "name": data.name,
        "email": data.email,
        "password": data.password,
        "role": data.role,
        "hospital_name": data.hospital_name,
        "location": data.location
    }).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=register_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            detail = err_json.get("detail", "Registration failed on central server")
        except Exception:
            detail = "Registration failed on central server"
        raise HTTPException(status_code=e.code, detail=detail)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect to central coordinator: {str(e)}"
        )

@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest):
    """
    Log in via the Central Coordinator authentication endpoint.
    This maintains the proxy architecture required for local-only communication.
    """
    url = f"{settings.CENTRAL_API_URL}/api/v1/auth/login"
    login_data = json.dumps({"email": data.email, "password": data.password}).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=login_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            detail = err_json.get("detail", "Authentication failed on central server")
        except Exception:
            detail = "Authentication failed on central server"
        raise HTTPException(status_code=e.code, detail=detail)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect to central coordinator: {str(e)}"
        )

@router.get("/me", response_model=LoginResponse)
async def get_me(
    current_user: dict = Depends(get_current_hospital_user),
    authorization: Optional[str] = Header(None)
):
    """
    Get current user details and hospital info by proxying to the Central Coordinator.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization token is required")
        
    url = f"{settings.CENTRAL_API_URL}/api/v1/auth/me"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", authorization)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            detail = err_json.get("detail", "Failed to retrieve user profile from central")
        except Exception:
            detail = "Failed to retrieve user profile from central"
        raise HTTPException(status_code=e.code, detail=detail)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect to central coordinator: {str(e)}"
        )
