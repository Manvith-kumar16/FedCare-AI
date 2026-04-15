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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Source CSV files (the hospital datasets in the project root)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
SOURCE_FILES = {
    1: os.path.join(PROJECT_ROOT, "hospital_1 (1).csv"),
    2: os.path.join(PROJECT_ROOT, "hospital_2 (1).csv"),
    3: os.path.join(PROJECT_ROOT, "hospital_3 (1).csv"),
    4: os.path.join(PROJECT_ROOT, "hospital_4 (1).csv"),
}

HOSPITALS = [
    {"name": "Apollo Medical Center", "location": "Mumbai, India"},
    {"name": "Fortis Healthcare", "location": "Delhi, India"},
    {"name": "AIIMS Research Hospital", "location": "Bangalore, India"},
    {"name": "Max Super Specialty", "location": "Chennai, India"},
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

        print("Seeding database...")

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
        print(f"  [OK] Admin user created (id={admin.id})")

        # 2. Create Hospital users and hospitals
        hospital_records = []
        for i, hosp_info in enumerate(HOSPITALS, 1):
            user = User(
                name=f"{hosp_info['name']} User",
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
            print(f"  [OK] Hospital '{hosp_info['name']}' created (id={hospital.id})")

        # 3. Create Diabetes Disease Server
        feature_cols = json.dumps([
            "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
            "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"
        ])
        server = DiseaseServer(
            name="Diabetes Prediction Server",
            disease_type="Diabetes",
            description="Federated AI pipeline for Type 2 Diabetes prediction using the Pima Indians dataset. Trains XGBoost models across hospital nodes with FedAvg.",
            input_type=InputType.TABULAR,
            model_type=ModelType.XGBOOST,
            fl_algorithm=FLAlgorithm.FEDAVG,
            status=ServerStatus.ACTIVE,
            created_by=admin.id,
            num_rounds=5,
            current_round=0,
            global_accuracy=0.72, # Seed with some accuracy
            target_column="Outcome",
            feature_columns=feature_cols,
        )
        session.add(server)
        
        # New Image Server
        image_server = DiseaseServer(
            name="Chest X-Ray Analysis",
            disease_type="Pneumonia",
            description="Federated pipeline for Pneumonia detection in Chest X-Rays using ResNet50. Processes DICOM and PNG images.",
            input_type=InputType.IMAGE,
            model_type=ModelType.RESNET,
            fl_algorithm=FLAlgorithm.FEDAVG,
            status=ServerStatus.ACTIVE,
            created_by=admin.id,
            num_rounds=20,
            current_round=0,
            global_accuracy=0.0,
            target_column="Pneumonia",
            feature_columns=json.dumps(["ImagePixels"]),
        )
        session.add(image_server)
        await session.flush()
        print(f"  [OK] Disease Servers created")

        # 4. Add all hospitals as members (no auto-dataset seeding)
        for i, hospital in enumerate(hospital_records, 1):
            # Status: APPROVED for first 3, PENDING for the 4th
            status = MemberStatus.APPROVED if i < 4 else MemberStatus.PENDING
            
            # Add membership to Diabetes server
            member = ServerMember(
                server_id=server.id,
                hospital_id=hospital.id,
                status=status,
            )
            session.add(member)

            # Add membership to Image server (only first 2)
            if i <= 2:
                session.add(ServerMember(
                    server_id=image_server.id,
                    hospital_id=hospital.id,
                    status=MemberStatus.APPROVED,
                ))

            print(f"  [OK] Hospital {i} registered as member")

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
