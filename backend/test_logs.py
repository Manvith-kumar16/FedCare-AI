import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models import TrainingLog

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(TrainingLog).order_by(TrainingLog.created_at.desc()).limit(15))
        logs = res.scalars().all()
        for l in logs:
            if l.details:
                print(f"[{l.log_type}] {l.hospital_name}: {l.details}")

if __name__ == "__main__":
    asyncio.run(main())
