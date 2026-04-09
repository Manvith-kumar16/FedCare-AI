from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.dataset import Dataset


class DatasetRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **data) -> Dataset:
        obj = Dataset(**data)
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def list_for_server_and_hospital(self, server_id: int, hospital_id: int):
        q = select(Dataset).where(Dataset.server_id == server_id, Dataset.hospital_id == hospital_id)
        res = await self.session.execute(q)
        return res.scalars().all()
