"""Database seed script - creates initial users, hospitals, disease server, and loads datasets"""
import os
import json
import shutil
import pandas as pd
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal, engine
from app.models import Base, User, UserRole, Hospital, DiseaseServer, ServerMember, Dataset, MemberStatus
from app.models.disease_server import ServerStatus, InputType, ModelType, FLAlgorithm
from app.core import settings
from passlib.context import CryptContext

from app.core.security import pwd_context

# Source CSV files (the hospital datasets in the project root)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
SOURCE_FILES = {
    1: os.path.join(PROJECT_ROOT, "hospital_1 (1).csv"),
    2: os.path.join(PROJECT_ROOT, "hospital_2 (1).csv"),
    3: os.path.join(PROJECT_ROOT, "hospital_3 (1).csv"),
    4: os.path.join(PROJECT_ROOT, "hospital_4 (1).csv"),
}

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

        print("Seeding real data...")

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

        # 2. Create Hospital users and hospitals
        hospital_records = []
        
        # User's primary account
        custom_user = User(
            name="Principal Investigator",
            email="aj@gmail.com",
            password_hash=pwd_context.hash("123456"),
            role=UserRole.HOSPITAL,
            is_active=True,
        )
        session.add(custom_user)
        await session.flush()
        
        custom_hosp = Hospital(
            name="Primary Healthcare Center",
            location="Remote Facility",
            user_id=custom_user.id,
            dataset_count=0,
        )
        session.add(custom_hosp)
        await session.flush()
        hospital_records.append(custom_hosp)
        print(f"  [OK] User account aj@gmail.com initialized")

        for i, hosp_info in enumerate(HOSPITALS, 1):
            user = User(
                name=f"{hosp_info['name']} Admin",
                email=f"hospital{i}@fedcare.ai",
                password_hash=pwd_context.hash(f"hospital{i}"),
                role=UserRole.HOSPITAL,
                is_active=True,
            )
            session.add(user)
            await session.flush()

            hospital = Hospital(
                name=hosp_info["name"],
                location=hosp_info["location"],
                user_id=user.id,
                dataset_count=0,
            )
            session.add(hospital)
            await session.flush()
            hospital_records.append(hospital)
            print(f"  [OK] Hospital '{hosp_info['name']}' initialized")

        # 3. Create Diabetes Disease Server
        feature_cols = json.dumps([
            "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
            "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"
        ])
        server = DiseaseServer(
            name="Diabetes Prediction System",
            disease_type="Diabetes",
            description="Active Federated Learning pipeline for Type 2 Diabetes prediction using Pima Indians dataset. Supports XGBoost and Tabular data.",
            input_type=InputType.TABULAR,
            model_type=ModelType.XGBOOST,
            fl_algorithm=FLAlgorithm.FEDAVG,
            status=ServerStatus.ACTIVE,
            created_by=admin.id,
            num_rounds=10,
            current_round=0,
            global_accuracy=0.74,
            target_column="Outcome",
            feature_columns=feature_cols,
        )
        session.add(server)
        await session.flush()
        print(f"  [OK] Primary Disease Server initialized")


        # 4. Add all hospitals as members of the Diabetes system
        for i, hospital in enumerate(hospital_records, 1):
            member = ServerMember(
                server_id=server.id,
                hospital_id=hospital.id,
                status=MemberStatus.APPROVED,
            )
            session.add(member)
            print(f"  [OK] Hospital '{hospital.name}' registered as member")


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
