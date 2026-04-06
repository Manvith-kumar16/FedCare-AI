from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        q = select(User).where(User.email == email)
        res = await self.session.execute(q)
        return res.scalars().first()

    async def get_by_id(self, user_id: int) -> User | None:
        q = select(User).where(User.id == user_id)
        res = await self.session.execute(q)
        return res.scalars().first()

    async def create(self, **data) -> User:
        obj = User(**data)
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj
