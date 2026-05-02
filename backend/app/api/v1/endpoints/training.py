"""
FedCare AI — Training Endpoints
Real XGBoost training: local per-hospital, federated FedAvg, and combined.
Includes SSE streaming for live log output.
"""
import json
import asyncio
import traceback
from functools import partial
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import (
    Dataset, DiseaseServer, Hospital, ServerMember, TrainingLog, MemberStatus,
)
from app.models.disease_server import ServerStatus
from app.schemas.training import TrainingLogResponse, TrainingRequest, TrainingStatus

router = APIRouter(prefix="/training", tags=["Training"])

# ── In-memory log store for SSE streaming ─────────────────────────────────────
# Maps server_id → list of recent log strings
_STREAM_LOGS: dict[int, list[str]] = {}


def _push_log(server_id: int, msg: str):
    """Push a log message to the in-memory stream buffer."""
    if server_id not in _STREAM_LOGS:
        _STREAM_LOGS[server_id] = []
    _STREAM_LOGS[server_id].append(msg)
    # Keep only last 500 lines
    if len(_STREAM_LOGS[server_id]) > 500:
        _STREAM_LOGS[server_id] = _STREAM_LOGS[server_id][-500:]


# ── SSE Stream Endpoint ───────────────────────────────────────────────────────

@router.get("/stream/{server_id}")
async def stream_training_logs(server_id: int):
    """
    SSE endpoint — streams live training log lines as they are produced.
    Connect with: EventSource('/api/v1/training/stream/{server_id}')
    """
    async def event_generator():
        sent = 0
        max_idle = 120  # seconds
        idle = 0
        while True:
            logs = _STREAM_LOGS.get(server_id, [])
            if sent < len(logs):
                for line in logs[sent:]:
                    yield f"data: {json.dumps({'log': line})}\n\n"
                sent = len(logs)
                idle = 0
            else:
                idle += 1
                if idle > max_idle * 2:  # 0.5s sleep
                    yield f"data: {json.dumps({'log': '__DONE__'})}\n\n"
                    break
            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Local Training ────────────────────────────────────────────────────────────

@router.post("/local/{server_id}")
async def start_local_training(
    server_id: int,
    background_tasks: BackgroundTasks,
    x_hospital_id: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger local XGBoost training for the requesting hospital on this server.
    Model saved as local_model_{hospital_id}.pkl.
    """
    if not x_hospital_id:
        raise HTTPException(status_code=403, detail="Hospital ID header required")

    hospital_id = int(x_hospital_id)

    # Verify membership
    member_res = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == server_id,
            ServerMember.hospital_id == hospital_id,
        )
    )
    member = member_res.scalar_one_or_none()
    if not member or member.status != MemberStatus.APPROVED:
        raise HTTPException(status_code=403, detail="You must be an approved member to train")

    # Get dataset for this hospital on this server
    ds_res = await db.execute(
        select(Dataset).where(
            Dataset.server_id == server_id,
            Dataset.hospital_id == hospital_id,
        )
    )
    datasets = ds_res.scalars().all()
    if not datasets:
        raise HTTPException(
            status_code=400,
            detail="No dataset found for your hospital on this server. Please upload a dataset first.",
        )

    # Get server schema
    srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = srv_res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    target_column = server.target_column

    # Use first valid dataset
    dataset = datasets[0]
    file_path = dataset.file_path

    # Clear stream logs for fresh run
    _STREAM_LOGS[server_id] = []

    background_tasks.add_task(
        _run_local_training_task,
        server_id=server_id,
        hospital_id=hospital_id,
        file_path=file_path,
        target_column=target_column,
    )

    return {
        "status": "local_training_started",
        "server_id": server_id,
        "hospital_id": hospital_id,
        "message": "Local training running in background. Connect to /stream/{server_id} for live logs.",
    }


async def _run_local_training_task(
    server_id: int,
    hospital_id: int,
    file_path: str,
    target_column: str,
):
    """Background task: run local training for a single hospital."""
    from app.db.session import AsyncSessionLocal
    from app.services.fl_service import run_local_training

    def log(msg):
        _push_log(server_id, msg)
        print(f"[local-train s{server_id} h{hospital_id}] {msg}")

    async with AsyncSessionLocal() as db:
        try:
            loop = asyncio.get_event_loop()

            log(f"=== Local Training Started — Hospital {hospital_id} ===")
            log(f"Dataset: {file_path}")
            log(f"Target: {target_column}")

            result = await loop.run_in_executor(
                None,
                partial(
                    run_local_training,
                    hospital_id=hospital_id,
                    server_id=server_id,
                    file_path=file_path,
                    target_column=target_column,
                    log_callback=log,
                ),
            )

            metrics = result["metrics"]
            log(f"✅ Local Training Complete!")
            log(f"   Accuracy : {metrics['accuracy']:.4f}")
            log(f"   F1 Score : {metrics['f1']:.4f}")
            log(f"   AUC-ROC  : {metrics.get('auc', 0):.4f}")
            log(f"   Loss     : {metrics['loss']:.4f}")
            log("Classification Report:")
            for line in metrics["report"].split("\n"):
                log(f"   {line}")

            # Save log to DB
            tlog = TrainingLog(
                server_id=server_id,
                round_number=0,
                hospital_id=hospital_id,
                hospital_name=f"Hospital {hospital_id}",
                local_accuracy=metrics["accuracy"],
                local_loss=metrics["loss"],
                local_f1=metrics["f1"],
                local_precision=metrics["precision"],
                local_recall=metrics["recall"],
                global_accuracy=0,
                global_loss=0,
                samples_trained=metrics["samples"],
                log_type="local",
                details=f"Local Training Complete\n{metrics['report']}",
            )
            db.add(tlog)

            # Update member's last_accuracy
            member_res = await db.execute(
                select(ServerMember).where(
                    ServerMember.server_id == server_id,
                    ServerMember.hospital_id == hospital_id,
                )
            )
            member = member_res.scalar_one_or_none()
            if member:
                member.last_accuracy = metrics["accuracy"]

            await db.commit()
            log(f"Log saved to database.")
            log("__DONE__")

        except Exception as e:
            err = f"❌ Local training failed: {e}\n{traceback.format_exc()}"
            log(err)
            print(err)


# ── Federated Training (FedAvg) ───────────────────────────────────────────────

@router.post("/federated/{server_id}")
async def start_federated_training(
    server_id: int,
    data: TrainingRequest,
    background_tasks: BackgroundTasks,
    x_user_role: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Start federated (FedAvg) training across all approved hospitals.
    Admin-only. Runs multiple rounds of: local training → aggregation.
    """
    is_admin = x_user_role and x_user_role.upper() == "ADMIN"
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can start federated training")

    srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = srv_res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if server.status == ServerStatus.TRAINING:
        raise HTTPException(status_code=400, detail="Training already in progress")

    # Get approved members with datasets
    member_res = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == server_id,
            ServerMember.status == MemberStatus.APPROVED,
        )
    )
    members = member_res.scalars().all()
    if not members:
        raise HTTPException(status_code=400, detail="No approved hospitals in this server")

    hospital_data = []
    for m in members:
        ds_res = await db.execute(
            select(Dataset).where(
                Dataset.server_id == server_id,
                Dataset.hospital_id == m.hospital_id,
            )
        )
        datasets = ds_res.scalars().all()
        if datasets:
            hosp_res = await db.execute(select(Hospital).where(Hospital.id == m.hospital_id))
            hosp = hosp_res.scalar_one_or_none()
            hospital_data.append({
                "hospital_id": m.hospital_id,
                "hospital_name": hosp.name if hosp else f"Hospital {m.hospital_id}",
                "file_path": datasets[0].file_path,
                "target_column": server.target_column,
                "n_samples": datasets[0].row_count or 0,
            })

    if not hospital_data:
        raise HTTPException(
            status_code=400,
            detail="No hospitals have datasets uploaded. Please upload datasets first.",
        )

    num_rounds = data.num_rounds or server.num_rounds or 3

    # Mark training started
    server.status = ServerStatus.TRAINING
    server.current_round = 0
    server.num_rounds = num_rounds
    await db.execute(delete(TrainingLog).where(TrainingLog.server_id == server_id))
    await db.commit()

    _STREAM_LOGS[server_id] = []

    background_tasks.add_task(
        _run_federated_training_task,
        server_id=server_id,
        num_rounds=num_rounds,
        hospital_data=hospital_data,
        target_column=server.target_column,
    )

    return {
        "status": "federated_training_started",
        "server_id": server_id,
        "num_rounds": num_rounds,
        "participating_hospitals": len(hospital_data),
        "message": f"Federated training started: {len(hospital_data)} hospitals, {num_rounds} rounds.",
    }


async def _run_federated_training_task(
    server_id: int,
    num_rounds: int,
    hospital_data: List[dict],
    target_column: str,
):
    """Background: run full federated training pipeline."""
    from app.db.session import AsyncSessionLocal
    from app.services.fl_service import run_federated_round

    def log(msg):
        _push_log(server_id, msg)
        print(f"[federated s{server_id}] {msg}")

    async with AsyncSessionLocal() as db:
        try:
            loop = asyncio.get_event_loop()
            log(f"=== Federated Training Started ===")
            log(f"Hospitals: {[h['hospital_name'] for h in hospital_data]}")
            log(f"Rounds: {num_rounds}")

            all_round_metrics = []

            for round_num in range(1, num_rounds + 1):
                log(f"\n{'='*50}")
                log(f"ROUND {round_num}/{num_rounds}")
                log(f"{'='*50}")

                # Run local + aggregate in thread pool. Catch per-round failures
                # so a single hospital/model error doesn't abort the whole training.
                try:
                    round_result = await loop.run_in_executor(
                        None,
                        partial(
                            run_federated_round,
                            server_id=server_id,
                            round_num=round_num,
                            hospital_data=hospital_data,
                            run_local=True,
                            log_callback=log,
                        ),
                    )
                except Exception as e:
                    err = f"❌ Round {round_num} failed: {e}\n{traceback.format_exc()}"
                    log(err)
                    # Persist a training log entry for visibility
                    try:
                        await db.rollback()
                        tlog = TrainingLog(
                            server_id=server_id,
                            round_number=round_num,
                            hospital_id=None,
                            hospital_name="Round Failure",
                            local_accuracy=0,
                            local_loss=0,
                            local_f1=0,
                            global_accuracy=0,
                            global_loss=0,
                            samples_trained=0,
                            log_type="global",
                            details=str(err),
                        )
                        db.add(tlog)
                        await db.commit()
                    except Exception:
                        await db.rollback()
                    # continue to next round instead of aborting
                    continue

                all_round_metrics.append(round_result)

                # Persist round logs
                for ld in round_result["logs"]:
                    tlog = TrainingLog(
                        server_id=server_id,
                        round_number=round_num,
                        hospital_id=ld.get("hospital_id"),
                        hospital_name=ld.get("hospital_name", ""),
                        local_accuracy=ld.get("local_accuracy", 0),
                        local_loss=ld.get("local_loss", 0),
                        local_f1=ld.get("local_f1", 0),
                        local_precision=ld.get("local_precision", 0),
                        local_recall=ld.get("local_recall", 0),
                        global_accuracy=ld.get("global_accuracy", round_result["global_accuracy"]),
                        global_loss=ld.get("global_loss", round_result["global_loss"]),
                        samples_trained=ld.get("samples_trained", 0),
                        log_type=ld.get("log_type", "local"),
                        details=ld.get("details"),
                    )
                    db.add(tlog)

                # Update server progress
                srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
                server = srv_res.scalar_one()
                server.current_round = round_num
                server.global_accuracy = round_result["global_accuracy"]
                await db.commit()

                log(f"Round {round_num} Global Accuracy: {round_result['global_accuracy']:.4f}")
                log(f"Round {round_num} Global F1: {round_result['global_f1']:.4f}")

            # Mark completed
            if all_round_metrics:
                final = all_round_metrics[-1]
                srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
                server = srv_res.scalar_one()
                server.status = ServerStatus.COMPLETED
                server.global_accuracy = final["global_accuracy"]
                await db.commit()

                log(f"\n=== FEDERATED TRAINING COMPLETE ===")
                log(f"Final Global Accuracy: {final['global_accuracy']:.4f}")
                log(f"Final Global F1: {final['global_f1']:.4f}")
                log(f"Final AUC-ROC: {final.get('auc', 0):.4f}")
                log("__DONE__")
            else:
                raise ValueError("All federated rounds failed. No metrics generated.")

        except Exception as e:
            err = f"❌ Federated training error: {e}\n{traceback.format_exc()}"
            log(err)
            print(err)
            try:
                await db.rollback()
                srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
                server = srv_res.scalar_one()
                server.status = ServerStatus.ACTIVE
                await db.commit()
            except Exception:
                await db.rollback()


# ── Combined Full Training (no federation) ────────────────────────────────────

@router.post("/start")
async def start_training(
    data: TrainingRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Start federated training (wraps /federated/{server_id} for backwards compat)."""
    return await _start_combined_training(data, background_tasks, db, federated=True)


@router.post("/train-full")
async def train_full_model(
    data: TrainingRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Train one combined XGBoost on ALL hospital datasets (no FedAvg)."""
    return await _start_combined_training(data, background_tasks, db, federated=False)


async def _start_combined_training(data, background_tasks, db, federated: bool):
    srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == data.server_id))
    server = srv_res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if server.status == ServerStatus.TRAINING:
        raise HTTPException(status_code=400, detail="Training already in progress")

    ds_res = await db.execute(select(Dataset).where(Dataset.server_id == data.server_id))
    datasets = ds_res.scalars().all()
    if not datasets:
        raise HTTPException(status_code=400, detail="No datasets uploaded for this server")

    server.status = ServerStatus.TRAINING
    await db.execute(delete(TrainingLog).where(TrainingLog.server_id == data.server_id))
    await db.commit()

    _STREAM_LOGS[data.server_id] = []

    dataset_paths = [(ds.file_path, server.target_column) for ds in datasets]
    num_rounds = data.num_rounds or 200

    background_tasks.add_task(
        _run_combined_training_task,
        server_id=data.server_id,
        dataset_paths=dataset_paths,
        target_column=server.target_column,
        num_rounds=num_rounds,
    )

    return {
        "status": "training_started",
        "server_id": data.server_id,
        "message": f"Combined XGBoost training started on {len(datasets)} dataset(s)",
    }


async def _run_combined_training_task(
    server_id: int,
    dataset_paths: List[tuple],
    target_column: str,
    num_rounds: int,
):
    """Background task: combined training on all datasets."""
    from app.db.session import AsyncSessionLocal
    from app.services.ai_service import train_combined_model, detect_schema, load_dataframe

    def log(msg):
        _push_log(server_id, msg)
        print(f"[combined s{server_id}] {msg}")

    async with AsyncSessionLocal() as db:
        try:
            loop = asyncio.get_event_loop()
            log("=== Combined XGBoost Training Started ===")

            model, metrics, features = await loop.run_in_executor(
                None,
                partial(
                    train_combined_model,
                    datasets=dataset_paths,
                    server_id=server_id,
                    num_boost_round=num_rounds,
                    log_callback=log,
                ),
            )

            log("✅ Training Complete!")
            log(f"   Accuracy : {metrics['accuracy']:.4f}")
            log(f"   F1 Score : {metrics['f1']:.4f}")
            log(f"   AUC-ROC  : {metrics.get('auc', 0):.4f}")
            log(f"   Loss     : {metrics['loss']:.4f}")
            if metrics.get("history"):
                h = metrics["history"]
                log(f"   Loss History: {h[0]:.4f} → {h[-1]:.4f} over {len(h)} rounds")
            log("Classification Report:")
            for line in metrics["report"].split("\n"):
                log(f"   {line}")

            # Save log
            tlog = TrainingLog(
                server_id=server_id,
                round_number=1,
                hospital_id=None,
                hospital_name="All Hospitals (Combined)",
                local_accuracy=metrics["accuracy"],
                local_loss=metrics["loss"],
                local_f1=metrics["f1"],
                local_precision=metrics["precision"],
                local_recall=metrics["recall"],
                global_accuracy=metrics["accuracy"],
                global_loss=metrics["loss"],
                samples_trained=metrics["samples"],
                log_type="global",
                details=(
                    f"Combined XGBoost Training Complete\n"
                    f"Features: {features}\n"
                    f"Target: {target_column}\n"
                    f"Classification Report:\n{metrics['report']}"
                ),
            )
            db.add(tlog)

            # Update server
            srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
            server = srv_res.scalar_one()
            server.status = ServerStatus.COMPLETED
            server.current_round = 1
            server.num_rounds = 1
            server.global_accuracy = metrics["accuracy"]
            server.feature_columns = json.dumps(features)
            server.target_column = target_column
            await db.commit()

            log("Database updated. Training session COMPLETED.")
            log("__DONE__")

        except Exception as e:
            err = f"❌ Combined training error: {e}\n{traceback.format_exc()}"
            log(err)
            try:
                srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
                srv = srv_res.scalar_one()
                srv.status = ServerStatus.ACTIVE
                await db.commit()
            except Exception:
                pass


# ── Status & Logs ─────────────────────────────────────────────────────────────

@router.get("/status/{server_id}", response_model=TrainingStatus)
async def get_training_status(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    x_user_role: Optional[str] = Header(None),
    x_hospital_id: Optional[str] = Header(None),
):
    """Get training status and log history for a server."""
    is_admin = x_user_role and x_user_role.upper() == "ADMIN"

    if not is_admin and x_hospital_id:
        member_res = await db.execute(
            select(ServerMember).where(
                ServerMember.server_id == server_id,
                ServerMember.hospital_id == int(x_hospital_id),
            )
        )
        member = member_res.scalar_one_or_none()
        if not member or member.status != MemberStatus.APPROVED:
            raise HTTPException(status_code=403, detail="Access denied")

    srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = srv_res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    log_res = await db.execute(
        select(TrainingLog)
        .where(TrainingLog.server_id == server_id)
        .order_by(TrainingLog.round_number, TrainingLog.id)
    )
    logs = log_res.scalars().all()

    member_count_res = await db.execute(
        select(func.count(ServerMember.id)).where(ServerMember.server_id == server_id)
    )
    member_count = member_count_res.scalar() or 0

    log_responses = []
    for log in logs:
        if log.log_type == "global":
            display = "Global Aggregate"
        elif is_admin or (x_hospital_id and str(log.hospital_id) == str(x_hospital_id)):
            display = log.hospital_name
        else:
            display = f"Secure Node {log.hospital_id}"

        log_responses.append(
            TrainingLogResponse(
                id=log.id,
                server_id=log.server_id,
                round_number=log.round_number,
                hospital_id=log.hospital_id,
                hospital_name=display,
                local_accuracy=log.local_accuracy,
                local_loss=log.local_loss,
                local_f1=log.local_f1,
                local_precision=log.local_precision,
                local_recall=log.local_recall,
                global_accuracy=log.global_accuracy,
                global_loss=log.global_loss,
                samples_trained=log.samples_trained,
                log_type=log.log_type,
                details=log.details,
                created_at=log.created_at,
            )
        )

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
            details=log.details,
            created_at=log.created_at,
        )
        for log in logs
    ]
