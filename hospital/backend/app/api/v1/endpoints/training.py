"""Training endpoints (hospital local)"""
import urllib.request
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.db import get_db
from app.models.dataset import Dataset
from app.models.training_history import TrainingHistory
from app.schemas.training import LocalTrainingRequest, LocalTrainingHistoryResponse
from app.services.ai_service import train_local_model, train_local_cnn
from app.services.fl_client import check_and_run_federated_round
from app.api.deps import get_current_hospital_user, oauth2_scheme
from app.core import settings

router = APIRouter(prefix="/training", tags=["Training"])

# In-memory stream logs for hospital UI feedback
_STREAM_LOGS: dict[int, list[str]] = {}

def _push_log(server_id: int, msg: str):
    if server_id not in _STREAM_LOGS:
        _STREAM_LOGS[server_id] = []
    _STREAM_LOGS[server_id].append(msg)


@router.post("/local-start")
async def start_local_training(
    data: LocalTrainingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_hospital_user),
    token: str = Depends(oauth2_scheme)
):
    """Run local training on the hospital's local dataset."""
    # Find dataset
    ds_res = await db.execute(
        select(Dataset).where(
            Dataset.server_id == data.server_id,
            Dataset.hospital_id == current_user["hospital_id"]
        )
    )
    dataset = ds_res.scalars().first()
    if not dataset:
        raise HTTPException(
            status_code=400,
            detail="No local dataset found for this server. Please upload a dataset first."
        )

    # We fetch model_type and target_column details from Central Coordinator
    url = f"{settings.CENTRAL_API_URL}/api/v1/servers/{data.server_id}"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {token}")
    # Retrieve auth header to forward to Central Coordinator
    # (or use generic central authentication for node communication)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            server_info = json.loads(response.read().decode("utf-8"))
            print("FETCHED SERVER INFO:", server_info)
            model_type = server_info.get("model_type", "xgboost")
            print("MODEL TYPE:", model_type)
            target_column = server_info.get("target_column", "Outcome")
    except Exception as e:
        print(f"Error fetching server info from central: {e}")
        # fallback defaults
        model_type = "xgboost"
        target_column = dataset.target_column

    try:
        # Bypassing model_type check and using dataset file extension to robustly route
        if dataset.file_path.lower().endswith(".zip") or (isinstance(model_type, str) and model_type.lower() == "cnn"):
            print("ROUTING TO CNN PIPELINE")
            model, metrics = train_local_cnn(
                file_path=dataset.file_path,
                hospital_id=current_user["hospital_id"],
                server_id=data.server_id,
                epochs=data.epochs or 5,
                log_callback=lambda msg: _push_log(data.server_id, msg)
            )
        else:
            print(f"ROUTING TO TABULAR PIPELINE. model_type was: {model_type}")
            model, metrics = train_local_model(
                file_path=dataset.file_path,
                target_column=target_column,
                hospital_id=current_user["hospital_id"],
                server_id=data.server_id,
                model_type=model_type,
                epochs=data.epochs or 10,
                log_callback=lambda msg: _push_log(data.server_id, msg)
            )
        
        # Save locally in history (round = 0 represents local-only run)
        hist = TrainingHistory(
            server_id=data.server_id,
            round_number=0,
            local_accuracy=metrics["accuracy"],
            local_loss=metrics["loss"],
            local_f1=metrics["f1"],
            local_precision=metrics["precision"],
            local_recall=metrics["recall"],
            samples_trained=dataset.row_count,
            details=f"Local-only training completed. Accuracy: {metrics['accuracy']:.4f}"
        )
        db.add(hist)
        await db.commit()
        await db.refresh(hist)
        
        return {
            "status": "completed",
            "metrics": metrics,
            "history_id": hist.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Local training execution error: {str(e)}")


@router.post("/sync")
async def trigger_federated_sync(
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_hospital_user)
):
    """
    Trigger node synchronization with central coordinator:
    Poll active rounds, train on new global model, submit update.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization token is required to sync")

    # Extract token
    token = authorization.replace("Bearer ", "").strip()

    # Run sync in background or inline. Let's run it inline so the API response blocks until it is done,
    # giving the verification script immediate feedback!
    result = await check_and_run_federated_round(db, token)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result


@router.get("/history", response_model=List[LocalTrainingHistoryResponse])
async def list_training_history(
    server_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_hospital_user)
):
    """List local training executions."""
    query = select(TrainingHistory).order_by(TrainingHistory.created_at.desc())
    if server_id:
        query = query.where(TrainingHistory.server_id == server_id)
        
    res = await db.execute(query)
    history = res.scalars().all()
    return history


@router.get("/logs/{server_id}")
async def get_training_logs(
    server_id: int,
    current_user: dict = Depends(get_current_hospital_user)
):
    """Get training logs for a specific server execution."""
    return _STREAM_LOGS.get(server_id, [])
