import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import User

async def test():
    async with AsyncSessionLocal() as session:
        r = await session.execute(select(User.email))
        print(f"All users: {[u[0] for u in r.fetchall()]}")

if __name__ == "__main__":
    asyncio.run(test())
