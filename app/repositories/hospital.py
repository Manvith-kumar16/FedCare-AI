from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.hospital import Hospital


class HospitalRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **data) -> Hospital:
        obj = Hospital(**data)
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def get_by_id(self, hospital_id: int) -> Hospital | None:
        q = select(Hospital).where(Hospital.id == hospital_id)
        res = await self.session.execute(q)
        return res.scalars().first()
