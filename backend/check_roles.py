import asyncio
from app.db import AsyncSessionLocal as SessionLocal
from app.models.user import User
from sqlalchemy import select

from app.models.hospital import Hospital

async def check():
    async with SessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        print("--- Users ---")
        for u in users:
            print(f"ID: {u.id}, Name: {u.name}, Email: {u.email}, Role: {u.role}")
        
        h_res = await db.execute(select(Hospital))
        hospitals = h_res.scalars().all()
        print("\n--- Hospitals ---")
        for h in hospitals:
            print(f"ID: {h.id}, Name: {h.name}, UserID: {h.user_id}")

if __name__ == "__main__":
    asyncio.run(check())
