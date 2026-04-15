"""Training endpoints"""
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.db import get_db
from app.models import DiseaseServer, ServerMember, Hospital, TrainingLog, Dataset
from app.models.disease_server import ServerStatus
from app.schemas.training import TrainingRequest, TrainingLogResponse, TrainingStatus
from app.services.fl_service import FederatedLearningEngine

router = APIRouter(prefix="/training", tags=["Training"])


@router.post("/start")
async def start_training(
    data: TrainingRequest, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Start federated training for a disease server in the background."""
    # Get server
    result = await db.execute(select(DiseaseServer).where(DiseaseServer.id == data.server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.status == ServerStatus.TRAINING:
        raise HTTPException(status_code=400, detail="Training already in progress")

    # Get participating hospitals
    member_result = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == data.server_id,
            ServerMember.status == "APPROVED"
        )
    )
    members = member_result.scalars().all()
    if not members:
        raise HTTPException(status_code=400, detail="No approved hospitals joined this server")

    # Check datasets exist
    ds_result = await db.execute(
        select(Dataset).where(Dataset.server_id == data.server_id)
    )
    datasets = ds_result.scalars().all()
    if not datasets:
        raise HTTPException(status_code=400, detail="No datasets uploaded for this server")

    # Get hospital names
    hospital_ids = [m.hospital_id for m in members]
    hospital_names = {}
    for hid in hospital_ids:
        hosp_result = await db.execute(select(Hospital).where(Hospital.id == hid))
        hospital = hosp_result.scalar_one_or_none()
        if hospital:
            hospital_names[hid] = hospital.name

    # Update server status
    server.status = ServerStatus.TRAINING
    num_rounds = data.num_rounds or server.num_rounds
    server.num_rounds = num_rounds
    await db.commit()

    # Clear previous training logs
    from sqlalchemy import delete
    await db.execute(delete(TrainingLog).where(TrainingLog.server_id == data.server_id))
    await db.commit()

    # Background task for federated learning
    background_tasks.add_task(
        run_training_simulation,
        data.server_id,
        hospital_ids,
        hospital_names,
        num_rounds,
        data.local_epochs or 10
    )

    return {
        "status": "training_started",
        "server_id": data.server_id,
        "message": f"Federated training started for {len(hospital_ids)} hospitals"
    }


async def run_training_simulation(server_id, hospital_ids, hospital_names, num_rounds, local_epochs):
    """Internal task to run the FL engine and update DB."""
    from app.db.session import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        fl_engine = FederatedLearningEngine(
            server_id=server_id,
            num_rounds=num_rounds,
            local_epochs=local_epochs,
        )

        try:
            result = fl_engine.run_federated_training(hospital_ids, hospital_names)
            
            if "error" in result:
                query = select(DiseaseServer).where(DiseaseServer.id == server_id)
                res = await db.execute(query)
                server = res.scalar_one()
                server.status = ServerStatus.ACTIVE
                await db.commit()
                return

            # Save training logs
            for log_data in result["logs"]:
                log = TrainingLog(
                    server_id=log_data["server_id"],
                    round_number=log_data["round_number"],
                    hospital_id=log_data.get("hospital_id"),
                    hospital_name=log_data.get("hospital_name"),
                    local_accuracy=log_data.get("local_accuracy", 0),
                    local_loss=log_data.get("local_loss", 0),
                    local_f1=log_data.get("local_f1", 0),
                    local_precision=log_data.get("local_precision", 0),
                    local_recall=log_data.get("local_recall", 0),
                    global_accuracy=log_data.get("global_accuracy", 0),
                    global_loss=log_data.get("global_loss", 0),
                    samples_trained=log_data.get("samples_trained", 0),
                    log_type=log_data.get("log_type", "local"),
                )
                db.add(log)

            # Update server
            query = select(DiseaseServer).where(DiseaseServer.id == server_id)
            res = await db.execute(query)
            server = res.scalar_one()
            server.status = ServerStatus.COMPLETED
            server.current_round = num_rounds
            server.global_accuracy = result.get("final_global_accuracy", 0)
            await db.commit()

        except Exception as e:
            print(f"Training Background Task Error: {e}")
            query = select(DiseaseServer).where(DiseaseServer.id == server_id)
            res = await db.execute(query)
            server = res.scalar_one()
            server.status = ServerStatus.ACTIVE
            await db.commit()


@router.get("/status/{server_id}", response_model=TrainingStatus)
async def get_training_status(server_id: int, db: AsyncSession = Depends(get_db)):
    """Get training status and logs for a server."""
    result = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Get training logs
    log_result = await db.execute(
        select(TrainingLog)
        .where(TrainingLog.server_id == server_id)
        .order_by(TrainingLog.round_number, TrainingLog.id)
    )
    logs = log_result.scalars().all()

    # Count participating hospitals
    member_result = await db.execute(
        select(func.count(ServerMember.id)).where(ServerMember.server_id == server_id)
    )
    member_count = member_result.scalar() or 0

    log_responses = [
        TrainingLogResponse(
            id=log.id,
            server_id=log.server_id,
            round_number=log.round_number,
            hospital_id=log.hospital_id,
            hospital_name=log.hospital_name,
            local_accuracy=log.local_accuracy,
            local_loss=log.local_loss,
            local_f1=log.local_f1,
            local_precision=log.local_precision,
            local_recall=log.local_recall,
            global_accuracy=log.global_accuracy,
            global_loss=log.global_loss,
            samples_trained=log.samples_trained,
            log_type=log.log_type,
            created_at=log.created_at,
        )
        for log in logs
    ]

    return TrainingStatus(
        server_id=server.id,
        server_name=server.name,
        status=server.status.value,
        current_round=server.current_round,
        total_rounds=server.num_rounds,
        global_accuracy=server.global_accuracy,
        participating_hospitals=member_count,
        logs=log_responses,
    )


@router.get("/logs/{server_id}", response_model=List[TrainingLogResponse])
async def get_training_logs(
    server_id: int,
    log_type: str = None,
    round_number: int = None,
    db: AsyncSession = Depends(get_db),
):
    """Get training logs with optional filters."""
    query = select(TrainingLog).where(TrainingLog.server_id == server_id)

    if log_type:
        query = query.where(TrainingLog.log_type == log_type)
    if round_number:
        query = query.where(TrainingLog.round_number == round_number)

    query = query.order_by(TrainingLog.round_number, TrainingLog.id)
    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        TrainingLogResponse(
            id=log.id,
            server_id=log.server_id,
            round_number=log.round_number,
            hospital_id=log.hospital_id,
            hospital_name=log.hospital_name,
            local_accuracy=log.local_accuracy,
            local_loss=log.local_loss,
            local_f1=log.local_f1,
            local_precision=log.local_precision,
            local_recall=log.local_recall,
            global_accuracy=log.global_accuracy,
            global_loss=log.global_loss,
            samples_trained=log.samples_trained,
            log_type=log.log_type,
            created_at=log.created_at,
        )
        for log in logs
    ]
