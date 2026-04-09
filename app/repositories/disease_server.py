from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.disease_server import DiseaseServer
from app.models.server_member import ServerMember


class DiseaseServerRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **data) -> DiseaseServer:
        obj = DiseaseServer(**data)
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def list_all(self) -> list[ DiseaseServer ]:
        q = select(DiseaseServer)
        res = await self.session.execute(q)
        return res.scalars().all()

    async def get_by_id(self, server_id: int) -> DiseaseServer | None:
        q = select(DiseaseServer).where(DiseaseServer.id == server_id)
        res = await self.session.execute(q)
        return res.scalars().first()

    async def update_status(self, server_id: int, status: str) -> DiseaseServer | None:
        q = update(DiseaseServer).where(DiseaseServer.id == server_id).values(status=status)
        await self.session.execute(q)
        await self.session.commit()
        return await self.get_by_id(server_id)


class ServerMemberRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_server(self, server_id: int) -> list[ServerMember]:
        q = select(ServerMember).where(ServerMember.server_id == server_id)
        res = await self.session.execute(q)
        return res.scalars().all()
