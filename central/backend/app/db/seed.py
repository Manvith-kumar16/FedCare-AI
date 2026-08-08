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

        # 3. Create Diabetes Disease Server (XGBoost)
        feature_cols = json.dumps([
            "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
            "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"
        ])
        server = DiseaseServer(
            name="Diabetes Prediction System (XGBoost)",
            disease_type="Diabetes",
            description="Active Federated Learning pipeline for Type 2 Diabetes prediction using Pima Indians dataset. Supports XGBoost (Voting Ensemble Aggregation) and Tabular data.",
            input_type=InputType.TABULAR,
            model_type=ModelType.XGBOOST,
            fl_algorithm=FLAlgorithm.FEDAVG,
            status=ServerStatus.ACTIVE,
            created_by=admin.id,
            num_rounds=5,
            current_round=0,
            global_accuracy=0.74,
            target_column="Outcome",
            feature_columns=feature_cols,
        )
        session.add(server)
        await session.flush()
        print(f"  [OK] XGBoost Disease Server initialized")

        # 4. Create Diabetes Disease Server (Logistic Regression)
        server_lr = DiseaseServer(
            name="Diabetes Prediction System (Logistic Regression)",
            disease_type="Diabetes",
            description="Active Federated Learning pipeline for Type 2 Diabetes prediction using Pima Indians dataset. Supports Logistic Regression (Weighted FedAvg Aggregation) and Tabular data.",
            input_type=InputType.TABULAR,
            model_type=ModelType.LOGISTIC_REGRESSION,
            fl_algorithm=FLAlgorithm.FEDAVG,
            status=ServerStatus.ACTIVE,
            created_by=admin.id,
            num_rounds=5,
            current_round=0,
            global_accuracy=0.70,
            target_column="Outcome",
            feature_columns=feature_cols,
        )
        session.add(server_lr)
        await session.flush()
        print(f"  [OK] Logistic Regression Disease Server initialized")

        # 5. Add all hospitals as members of both servers
        for hospital in hospital_records:
            member = ServerMember(
                server_id=server.id,
                hospital_id=hospital.id,
                status=MemberStatus.APPROVED,
            )
            session.add(member)
            
            member_lr = ServerMember(
                server_id=server_lr.id,
                hospital_id=hospital.id,
                status=MemberStatus.APPROVED,
            )
            session.add(member_lr)
            print(f"  [OK] Hospital '{hospital.name}' registered to both servers")

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
