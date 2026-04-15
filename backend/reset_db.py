import asyncio
from app.db.session import engine
from app.models import Base

async def reset():
    print("Dropping tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("Tables dropped.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset())
