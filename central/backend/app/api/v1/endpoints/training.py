"""
FedCare AI Central — Training Coordination Endpoints
"""
import json
import asyncio
import os
import hashlib
import traceback
from datetime import datetime
import numpy as np
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, update
from typing import List, Optional
from app.db import get_db
from app.models.user import User
from app.models.disease_server import DiseaseServer, ServerStatus, ModelType
from app.models.server_member import ServerMember, MemberStatus
from app.models.training_round import TrainingRound, RoundStatus
from app.models.model_version import ModelVersion
from app.models.model_update import ModelUpdate, UpdateStatus
from app.models.training_log import TrainingLog
from app.api.deps import get_current_active_admin
from app.core import settings
from app.services.fl_coordinator import (
    aggregate_xgboost_ensemble,
    aggregate_logistic_regression,
    aggregate_metrics
)

router = APIRouter(prefix="/training", tags=["Training Orchestration"])

# SSE stream buffers mapping server_id -> list of logs
_STREAM_LOGS: dict[int, list[str]] = {}

def _push_log(server_id: int, msg: str):
    if server_id not in _STREAM_LOGS:
        _STREAM_LOGS[server_id] = []
    _STREAM_LOGS[server_id].append(msg)
    if len(_STREAM_LOGS[server_id]) > 500:
        _STREAM_LOGS[server_id] = _STREAM_LOGS[server_id][-500:]


def calculate_file_sha256(file_path: str) -> str:
    """Compute SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()


@router.get("/stream/{server_id}")
async def stream_training_logs(server_id: int):
    """
    SSE stream endpoint for tracking round aggregation progress.
    """
    async def event_generator():
        sent = 0
        max_idle = 300  # seconds
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
                if idle > max_idle * 2:
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


@router.post("/start/{server_id}")
async def start_training_round(
    server_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    """
    Admin triggers the start of a federated training round on a server.
    """
    # 1. Fetch server
    srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = srv_res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
        
    if server.status == ServerStatus.TRAINING:
        raise HTTPException(status_code=400, detail="Training is already in progress on this server")

    # 2. Get approved server members
    members_res = await db.execute(
        select(ServerMember).where(
            and_(
                ServerMember.server_id == server_id,
                ServerMember.status == MemberStatus.APPROVED
            )
        )
    )
    members = members_res.scalars().all()
    if not members:
        raise HTTPException(
            status_code=400,
            detail="No approved hospital members registered to this server"
        )

    # 3. Create initial global model if it doesn't exist
    global_model_dir = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
    os.makedirs(global_model_dir, exist_ok=True)
    global_model_path = os.path.join(global_model_dir, "global_model.pkl")
    
    # Check if we already have an active seed version in the database
    mv_check = await db.execute(
        select(ModelVersion).where(
            and_(
                ModelVersion.server_id == server_id,
                ModelVersion.is_active == True
            )
        )
    )
    if not mv_check.scalar_one_or_none():
        # Create an untrained base model and save it to act as seed
        import pickle
        if server.model_type == ModelType.LOGISTIC_REGRESSION:
            from sklearn.linear_model import LogisticRegression
            seed_model = LogisticRegression(random_state=42)
            # fit dummy data to initialize
            seed_model.fit(np.zeros((2, 8)), np.array([0, 1]))
        else:
            from xgboost import XGBClassifier
            seed_model = XGBClassifier(random_state=42, use_label_encoder=False, eval_metric="logloss")
            seed_model.fit(np.zeros((2, 8)), np.array([0, 1]))
            
        with open(global_model_path, "wb") as f:
            pickle.dump(seed_model, f)
            
        seed_hash = calculate_file_sha256(global_model_path)
        
        # Save initial version index
        init_version = ModelVersion(
            server_id=server_id,
            version="v0.0.0",
            round_number=0,
            model_path=global_model_path,
            model_hash=seed_hash,
            metrics_json=json.dumps({"accuracy": server.global_accuracy}),
            is_active=True
        )
        db.add(init_version)
        print(f"Initialized global seed model for Server {server_id}")

    # 4. Increment round and update server status
    server.current_round += 1
    server.status = ServerStatus.TRAINING
    
    # Create the training round entry
    train_round = TrainingRound(
        server_id=server_id,
        round_number=server.current_round,
        status=RoundStatus.RUNNING,
        started_at=datetime.utcnow()
    )
    db.add(train_round)
    await db.commit()
    await db.refresh(train_round)

    # Reset SSE stream
    _STREAM_LOGS[server_id] = []
    _push_log(server_id, f"=== Federated Round {server.current_round} Started ===")
    _push_log(server_id, f"Hospitals registered: {len(members)}")
    _push_log(server_id, "Waiting for hospital nodes to poll and submit model updates...")

    return {
        "status": "round_started",
        "round_id": train_round.id,
        "round_number": server.current_round,
        "expected_clients": len(members),
        "message": f"Round {server.current_round} is now active. Directing clients to download model."
    }


@router.post("/aggregate/{server_id}")
async def trigger_aggregation(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    """
    Force aggregate the submitted hospital updates for the active round.
    Saves new global version and sets status back to ACTIVE.
    """
    _push_log(server_id, "Aggregation request received from administrator.")
    
    # 1. Get active round
    round_res = await db.execute(
        select(TrainingRound).where(
            and_(
                TrainingRound.server_id == server_id,
                TrainingRound.status == RoundStatus.RUNNING
            )
        )
    )
    active_round = round_res.scalar_one_or_none()
    if not active_round:
         raise HTTPException(status_code=400, detail="No active training round to aggregate")

    # 2. Get updates
    updates_res = await db.execute(
        select(ModelUpdate).where(
            and_(
                ModelUpdate.round_id == active_round.id,
                ModelUpdate.status == UpdateStatus.VALIDATED
            )
        )
    )
    updates = updates_res.scalars().all()
    if not updates:
        raise HTTPException(status_code=400, detail="No client updates have been submitted yet")

    _push_log(server_id, f"Beginning aggregation of {len(updates)} local updates...")

    # Fetch server details
    srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = srv_res.scalar_one()

    try:
        # 3. Perform model aggregation
        import pickle
        import torch
        from app.services.fl_coordinator import aggregate_cnn
        
        if server.model_type == ModelType.LOGISTIC_REGRESSION:
            global_model = aggregate_logistic_regression(updates)
        elif server.model_type == ModelType.CNN:
            global_model = aggregate_cnn(updates)
        else:
            global_model = aggregate_xgboost_ensemble(updates)

        # Extract feature columns and save to the server
        if hasattr(global_model, "feature_names_in_"):
            server.feature_columns = json.dumps(list(global_model.feature_names_in_))
        elif server.model_type == ModelType.CNN:
            server.feature_columns = json.dumps(["Image"])

        # 4. Save global model file
        dest_dir = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
        global_path = os.path.join(dest_dir, f"global_model_v{server.current_round}.pkl")
        with open(global_path, "wb") as f:
            pickle.dump(global_model, f)

        # Legacy active model path updates
        latest_path = os.path.join(dest_dir, "global_model.pkl")
        with open(latest_path, "wb") as f:
            pickle.dump(global_model, f)

        # Calculate hash
        model_hash = calculate_file_sha256(global_path)

        # 5. Compute global aggregated metrics
        global_metrics = aggregate_metrics(updates)
        _push_log(server_id, f"Aggregated Metrics: Acc={global_metrics['accuracy']:.4f}, F1={global_metrics['f1']:.4f}")

        # 6. Deactivate old model versions for this server
        await db.execute(
            update(ModelVersion)
            .where(ModelVersion.server_id == server_id)
            .values(is_active=False)
        )

        # Save new model version
        version_rec = ModelVersion(
            server_id=server_id,
            version=f"v0.{server.current_round}.0",
            round_number=server.current_round,
            model_path=global_path,
            model_hash=model_hash,
            metrics_json=json.dumps(global_metrics),
            is_active=True
        )
        db.add(version_rec)

        # Mark round completed
        active_round.status = RoundStatus.COMPLETED
        active_round.completed_at = datetime.utcnow()
        active_round.global_accuracy = global_metrics["accuracy"]
        active_round.global_precision = global_metrics["precision"]
        active_round.global_recall = global_metrics["recall"]
        active_round.global_f1 = global_metrics["f1"]
        active_round.global_auc = global_metrics["auc"]

        # Update model updates to AGGREGATED status
        for u in updates:
            u.status = UpdateStatus.AGGREGATED

        # Set server status back to ACTIVE
        server.status = ServerStatus.ACTIVE
        server.global_accuracy = global_metrics["accuracy"]

        # Log completion
        tlog = TrainingLog(
            server_id=server_id,
            round_number=server.current_round,
            hospital_id=None,
            hospital_name="Central Coordinator",
            local_accuracy=0.0,
            local_loss=0.0,
            local_f1=0.0,
            global_accuracy=global_metrics["accuracy"],
            global_loss=global_metrics["loss"],
            samples_trained=sum(u.sample_count for u in updates),
            log_type="global",
            details=f"Federated round {server.current_round} aggregation successful. Version: {version_rec.version}. Hash: {model_hash[:8]}"
        )
        db.add(tlog)

        await db.commit()
        _push_log(server_id, f"✅ Round {server.current_round} successfully aggregated and closed!")
        _push_log(server_id, "__DONE__")

        return {
            "status": "aggregated",
            "global_accuracy": global_metrics["accuracy"],
            "version": version_rec.version,
            "hash": model_hash
        }

    except Exception as e:
        err_msg = f"❌ Aggregation failed: {str(e)}\n{traceback.format_exc()}"
        _push_log(server_id, err_msg)
        
        # Reset server status to ACTIVE so it is not stuck
        server.status = ServerStatus.ACTIVE
        active_round.status = RoundStatus.FAILED
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Aggregation error: {str(e)}")


@router.get("/rounds", response_model=List[dict])
async def list_rounds(
    server_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """List training rounds for a server."""
    query = select(TrainingRound).order_by(TrainingRound.round_number.desc())
    if server_id:
        query = query.where(TrainingRound.server_id == server_id)
        
    res = await db.execute(query)
    rounds = res.scalars().all()
    
    response = []
    for r in rounds:
        # count updates submitted
        cnt_res = await db.execute(
            select(func.count(ModelUpdate.id)).where(ModelUpdate.round_id == r.id)
        )
        submitted = cnt_res.scalar() or 0
        
        # count expected clients (approved members of the server)
        exp_res = await db.execute(
            select(func.count(ServerMember.id)).where(
                and_(
                    ServerMember.server_id == r.server_id,
                    ServerMember.status == MemberStatus.APPROVED
                )
            )
        )
        expected = exp_res.scalar() or 0
        
        response.append({
            "id": r.id,
            "server_id": r.server_id,
            "round_number": r.round_number,
            "status": r.status.value,
            "started_at": r.started_at,
            "completed_at": r.completed_at,
            "submitted_count": submitted,
            "expected_clients": expected,
            "global_accuracy": r.global_accuracy,
            "global_precision": r.global_precision,
            "global_recall": r.global_recall,
            "global_f1": r.global_f1,
            "global_auc": r.global_auc
        })
    return response


@router.get("/logs/{server_id}", response_model=List[dict])
async def get_training_logs(
    server_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get training history log records for a server."""
    res = await db.execute(
        select(TrainingLog)
        .where(TrainingLog.server_id == server_id)
        .order_by(TrainingLog.created_at.asc())
    )
    logs = res.scalars().all()
    
    return [
        {
            "id": log.id,
            "round_number": log.round_number,
            "hospital_id": log.hospital_id,
            "hospital_name": log.hospital_name,
            "local_accuracy": log.local_accuracy,
            "local_loss": log.local_loss,
            "local_f1": log.local_f1,
            "local_precision": log.local_precision,
            "local_recall": log.local_recall,
            "global_accuracy": log.global_accuracy,
            "global_loss": log.global_loss,
            "samples_trained": log.samples_trained,
            "log_type": log.log_type,
            "details": log.details,
            "created_at": log.created_at
        }
        for log in logs
    ]


@router.get("/global-models", response_model=List[dict])
async def list_global_models(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    """
    Get all global model versions across all servers (Admin only).
    """
    result = await db.execute(select(ModelVersion).order_by(ModelVersion.created_at.desc()))
    models = result.scalars().all()
    
    response = []
    for m in models:
        srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == m.server_id))
        server = srv_res.scalar_one_or_none()
        
        response.append({
            "id": m.id,
            "server_id": m.server_id,
            "server_name": server.name if server else f"Server #{m.server_id}",
            "disease_type": server.disease_type if server else "N/A",
            "model_type": server.model_type.value if server else "N/A",
            "version": m.version,
            "round_number": m.round_number,
            "model_path": m.model_path,
            "model_hash": m.model_hash,
            "metrics_json": json.loads(m.metrics_json) if m.metrics_json else {},
            "is_active": m.is_active,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })
    return response

