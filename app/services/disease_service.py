from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.disease_server import DiseaseServerRepository, ServerMemberRepository
from app.models.disease_server import DiseaseServer


class DiseaseService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.servers = DiseaseServerRepository(session)
        self.members = ServerMemberRepository(session)

    async def create_server(self, created_by: int, data: dict) -> DiseaseServer:
        payload = {**data, "created_by": created_by}
        server = await self.servers.create(**payload)
        return server

    async def list_servers(self) -> list[ DiseaseServer ]:
        return await self.servers.list_all()

    async def get_server(self, server_id: int) -> DiseaseServer | None:
        return await self.servers.get_by_id(server_id)

    async def update_status(self, server_id: int, status: str) -> DiseaseServer | None:
        return await self.servers.update_status(server_id, status)
