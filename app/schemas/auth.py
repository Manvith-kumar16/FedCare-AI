from pydantic import BaseModel, EmailStr
from typing import Optional


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str]
    exp: Optional[int]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
