import asyncio
from app.db.session import engine, AsyncSessionLocal
from app.models.base import Base
from app.models.user import User, UserRole
from app.core.security import get_password_hash

async def reset():
    print("Dropping tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("Tables dropped.")
    
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")
    
    print("Seeding admin...")
    async with AsyncSessionLocal() as db:
        admin = User(
            name="FedCare Admin",
            email="admin@fedcare.ai",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN
        )
        db.add(admin)
        await db.commit()
    print("Admin seeded (admin@fedcare.ai / admin123).")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset())
