from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.schemas.hospital import HospitalCreate, HospitalRead
from app.repositories.hospital import HospitalRepository

router = APIRouter()


@router.post("/hospitals", response_model=HospitalRead)
async def create_hospital(payload: HospitalCreate, session: AsyncSession = Depends(get_session)):
    repo = HospitalRepository(session)
    hospital = await repo.create(name=payload.name, admin_id=payload.admin_id)
    return hospital
