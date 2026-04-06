from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_session
from app.schemas.user import UserRead
from app.models.user import User

router = APIRouter()


@router.get("/users", response_model=List[UserRead])
async def list_users(session: AsyncSession = Depends(get_session)):
    q = await session.execute("SELECT * FROM users")
    rows = q.fetchall()
    # Minimal: return as-is; in production use ORM queries
    return [UserRead.from_orm(r) for r in rows]
