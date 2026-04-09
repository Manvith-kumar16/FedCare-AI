from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.prediction import Prediction


class PredictionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **data) -> Prediction:
        obj = Prediction(**data)
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def get_by_id(self, prediction_id: int) -> Prediction | None:
        q = select(Prediction).where(Prediction.id == prediction_id)
        res = await self.session.execute(q)
        return res.scalars().first()
