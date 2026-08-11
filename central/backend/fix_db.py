import asyncio
import json
import pickle
from app.db import AsyncSessionLocal
from sqlalchemy import select
from app.models.disease_server import DiseaseServer

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == 1))
        server = res.scalar_one_or_none()
        if server:
            with open("/home/manvith/Desktop/Projects/FedCare-AI/central/backend/saved_models/server_1/global_model.pkl", "rb") as f:
                model = pickle.load(f)
            if hasattr(model, "feature_names_in_"):
                server.feature_columns = json.dumps(list(model.feature_names_in_))
                await db.commit()
                print("Successfully updated database!")
            else:
                print("Model does not have feature_names_in_")

asyncio.run(main())
