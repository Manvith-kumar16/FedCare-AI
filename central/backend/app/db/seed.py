"""Database seed script - creates initial users, hospitals, and disease server"""
import json
from sqlalchemy import text
from app.db.session import AsyncSessionLocal, engine
from app.models import Base, User, UserRole, Hospital, DiseaseServer, ServerMember, MemberStatus
from app.models.disease_server import ServerStatus, InputType, ModelType, FLAlgorithm
from app.core.security import pwd_context

HOSPITALS = [
    {"name": "Metropolitan Health System", "location": "New York, USA"},
    {"name": "Central Research Hospital", "location": "London, UK"},
]

async def seed_database():
    """Seed the database with initial data."""
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        if count and count > 0:
            print("Database already seeded. Skipping.")
            return

        print("Seeding base user accounts...")

        # 1. Create Admin user
        admin = User(
            name="FedCare Admin",
            email="admin@fedcare.ai",
            password_hash=pwd_context.hash("admin123"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin)
        await session.flush()
        print(f"  [OK] Admin user created")

        # 2. Create Hospital user and hospital registry
        custom_user = User(
            name="Principal Investigator",
            email="aj@gmail.com",
            password_hash=pwd_context.hash("hospital123"),
            role=UserRole.HOSPITAL,
            is_active=True,
        )
        session.add(custom_user)
        await session.flush()
        
        custom_hosp = Hospital(
            name="Primary Healthcare Center",
            location="Base Facility",
            user_id=custom_user.id,
            dataset_count=0,
        )
        session.add(custom_hosp)
        await session.flush()
        print(f"  [OK] Base Hospital account aj@gmail.com initialized")

        await session.commit()
        print("\nDatabase seeding complete!")


async def create_tables():
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Database tables created.")


async def init_db():
    """Initialize database: create tables + seed."""
    await create_tables()
    await seed_database()


if __name__ == "__main__":
    import asyncio
    asyncio.run(init_db())
