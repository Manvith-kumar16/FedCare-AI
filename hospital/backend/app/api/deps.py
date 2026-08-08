from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.CENTRAL_API_URL}/api/v1/auth/login")

async def get_current_hospital_user(
    token: str = Depends(oauth2_scheme)
) -> dict:
    """
    Decodes the JWT token and verifies the user role and hospital node match.
    Enforces strict hospital-level isolation.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode token with the shared secret key
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        hosp_id: int = payload.get("hospital_id")
        
        if user_id is None or role is None or hosp_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    # Verify role
    if role.upper() != "HOSPITAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hospital role required to access local node resource"
        )
        
    # Verify hospital ID matches local node identity
    if int(hosp_id) != settings.HOSPITAL_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Resource belongs to hospital node {settings.HOSPITAL_ID}. You cannot access it."
        )
        
    return {
        "user_id": int(user_id),
        "role": role,
        "hospital_id": int(hosp_id)
    }
