import os
import json
import hashlib
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
import logging
from app.db import get_db
from app.models.disease_server import DiseaseServer, ServerStatus
from app.models.server_member import ServerMember, MemberStatus
from app.models.training_round import TrainingRound, RoundStatus
from app.models.model_version import ModelVersion
from app.models.model_update import ModelUpdate, UpdateStatus
from app.models.hospital import Hospital
from app.models.training_log import TrainingLog
from app.api.deps import get_current_hospital
from app.core import settings

logger = logging.getLogger("fedcare-central")
router = APIRouter(prefix="/federated", tags=["Federated Coordination"])


def calculate_file_sha256(file_path: str) -> str:
    """Compute the SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()


@router.get("/rounds/active")
async def get_active_rounds(
    db: AsyncSession = Depends(get_db),
    hospital: Hospital = Depends(get_current_hospital)
):
    """
    Get list of active training rounds for servers that this hospital is a member of.
    """
    # Get servers the hospital belongs to
    member_query = select(ServerMember.server_id).where(
        and_(
            ServerMember.hospital_id == hospital.id,
            ServerMember.status == MemberStatus.APPROVED
        )
    )
    member_servers_res = await db.execute(member_query)
    server_ids = member_servers_res.scalars().all()
    
    if not server_ids:
        return []
        
    # Get active rounds for those servers
    rounds_query = select(TrainingRound).where(
        and_(
            TrainingRound.server_id.in_(server_ids),
            TrainingRound.status == RoundStatus.RUNNING
        )
    )
    rounds_res = await db.execute(rounds_query)
    active_rounds = rounds_res.scalars().all()
    
    response = []
    for r in active_rounds:
        # Check if this hospital has already submitted an update for this round
        update_query = select(ModelUpdate).where(
            and_(
                ModelUpdate.round_id == r.id,
                ModelUpdate.hospital_id == hospital.id
            )
        )
        update_res = await db.execute(update_query)
        has_submitted = update_res.scalar_one_or_none() is not None
        
        # Get server details
        srv_query = select(DiseaseServer).where(DiseaseServer.id == r.server_id)
        srv_res = await db.execute(srv_query)
        server = srv_res.scalar_one()

        response.append({
            "round_id": r.id,
            "server_id": r.server_id,
            "server_name": server.name,
            "round_number": r.round_number,
            "model_type": server.model_type.value,
            "target_column": server.target_column,
            "feature_columns": json.loads(server.feature_columns or "[]"),
            "has_submitted": has_submitted
        })
        
    return response


@router.get("/global-model/{server_id}")
async def download_global_model(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    hospital: Hospital = Depends(get_current_hospital)
):
    """
    Download the latest global model for a disease server.
    """
    # Verify membership
    membership_res = await db.execute(
        select(ServerMember).where(
            and_(
                ServerMember.server_id == server_id,
                ServerMember.hospital_id == hospital.id,
                ServerMember.status == MemberStatus.APPROVED
            )
        )
    )
    if not membership_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not an approved member of this server"
        )
        
    # Get latest active model version
    mv_res = await db.execute(
        select(ModelVersion).where(
            and_(
                ModelVersion.server_id == server_id,
                ModelVersion.is_active == True
            )
        ).order_by(ModelVersion.round_number.desc())
    )
    model_version = mv_res.scalars().first()
    
    if not model_version or not os.path.exists(model_version.model_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active global model version found on central server"
        )
        
    # Return model file with custom headers
    return FileResponse(
        path=model_version.model_path,
        filename=os.path.basename(model_version.model_path),
        media_type="application/octet-stream",
        headers={
            "X-Model-Version": model_version.version,
            "X-Model-Round": str(model_version.round_number),
            "X-Model-Hash": model_version.model_hash
        }
    )


@router.post("/model-update")
async def submit_model_update(
    server_id: int = Form(...),
    round_number: int = Form(...),
    sample_count: int = Form(...),
    local_metrics: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    hospital: Hospital = Depends(get_current_hospital)
):
    """
    Hospital node submits a trained local model file update.
    """
    # 1. Verify active round
    round_res = await db.execute(
        select(TrainingRound).where(
            and_(
                TrainingRound.server_id == server_id,
                TrainingRound.round_number == round_number,
                TrainingRound.status == RoundStatus.RUNNING
            )
        )
    )
    active_round = round_res.scalar_one_or_none()
    if not active_round:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active training round found matching this server/round number"
        )

    # 2. Prevent duplicate submissions
    duplicate_res = await db.execute(
        select(ModelUpdate).where(
            and_(
                ModelUpdate.round_id == active_round.id,
                ModelUpdate.hospital_id == hospital.id
            )
        )
    )
    if duplicate_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This hospital node has already submitted an update for the active round"
        )

    # 3. Create destination directory and save update file
    dest_dir = os.path.join(settings.MODELS_DIR, f"server_{server_id}", f"round_{round_number}")
    os.makedirs(dest_dir, exist_ok=True)
    
    file_path = os.path.join(dest_dir, f"update_hosp_{hospital.id}.pkl")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save update file: {str(e)}"
        )

    # 4. Compute integrity hash
    update_hash = calculate_file_sha256(file_path)

    # 5. Persist update record
    update_rec = ModelUpdate(
        round_id=active_round.id,
        hospital_id=hospital.id,
        model_version=f"round_{round_number}_hosp_{hospital.id}",
        sample_count=sample_count,
        update_path=file_path,
        update_hash=update_hash,
        local_metrics_json=local_metrics,
        status=UpdateStatus.VALIDATED
    )
    db.add(update_rec)
    
    # 6. Add training log
    try:
        metrics_dict = json.loads(local_metrics)
    except Exception:
        metrics_dict = {}
        
    tlog = TrainingLog(
        server_id=server_id,
        round_number=round_number,
        hospital_id=hospital.id,
        hospital_name=hospital.name,
        local_accuracy=metrics_dict.get("accuracy", 0.0),
        local_loss=metrics_dict.get("loss", 0.0),
        local_f1=metrics_dict.get("f1", 0.0),
        local_precision=metrics_dict.get("precision", 0.0),
        local_recall=metrics_dict.get("recall", 0.0),
        global_accuracy=0.0, # Filled at round aggregation
        global_loss=0.0,
        samples_trained=sample_count,
        log_type="local",
        details=f"Local submission validated. Hash: {update_hash[:8]}..."
    )
    db.add(tlog)
    
    # Save last accuracy to server member
    member_res = await db.execute(
        select(ServerMember).where(
            and_(
                ServerMember.server_id == server_id,
                ServerMember.hospital_id == hospital.id
            )
        )
    )
    member = member_res.scalar_one_or_none()
    if member:
        member.last_accuracy = metrics_dict.get("accuracy", 0.0)

    await db.commit()
    logger.info(f"📥 Received valid model update from Hospital '{hospital.name}' (Server {server_id}, Round {round_number})")
    
    return {
        "status": "update_accepted",
        "update_id": update_rec.id,
        "hash": update_hash
    }
