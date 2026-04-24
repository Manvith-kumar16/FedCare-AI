"""Training endpoints"""
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List, Optional
from app.db import get_db
from app.models import DiseaseServer, ServerMember, Hospital, TrainingLog, Dataset, MemberStatus
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
    feature_columns = json.loads(server.feature_columns) if server.feature_columns else []
    target_column = server.target_column

    background_tasks.add_task(
        run_training_simulation,
        data.server_id,
        hospital_ids,
        hospital_names,
        num_rounds,
        data.local_epochs or 10,
        feature_columns,
        target_column
    )

    return {
        "status": "training_started",
        "server_id": data.server_id,
        "message": f"Federated training started for {len(hospital_ids)} hospitals"
    }


async def run_training_simulation(server_id, hospital_ids, hospital_names, num_rounds, local_epochs, feature_columns, target_column):
    """Internal task to run the FL engine and update DB."""
    from app.db.session import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        fl_engine = FederatedLearningEngine(
            server_id=server_id,
            feature_columns=feature_columns,
            target_column=target_column,
            num_rounds=num_rounds,
            local_epochs=local_epochs,
        )

        try:
            result = fl_engine.run_federated_training(hospital_ids, hospital_names)
            
            if "error" in result:
                log = TrainingLog(
                    server_id=server_id,
                    round_number=0,
                    hospital_name="SYSTEM",
                    log_type="info",
                    details=f"CRITICAL ERROR: {result['error']}. Please ensure datasets are uploaded and approved."
                )
                db.add(log)
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
                    details=log_data.get("details")
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
async def get_training_status(
    server_id: int, 
    db: AsyncSession = Depends(get_db),
    x_user_role: Optional[str] = Header(None),
    x_hospital_id: Optional[str] = Header(None)
):
    """Get training status and logs for a server with privacy checks."""
    # 1. Basic access check
    is_admin = x_user_role and x_user_role.upper() == "ADMIN"
    
    if not is_admin:
        if not x_hospital_id:
             raise HTTPException(status_code=403, detail="Hospital identification required")
        
        member_res = await db.execute(
            select(ServerMember).where(
                ServerMember.server_id == server_id,
                ServerMember.hospital_id == int(x_hospital_id)
            )
        )
        member = member_res.scalar_one_or_none()
        if not member or member.status != MemberStatus.APPROVED:
             raise HTTPException(status_code=403, detail="Access denied. You must be an approved member of this server.")

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

    log_responses = []
    for log in logs:
        if log.log_type == "global":
            display_name = "Global Aggregate"
        elif is_admin or (x_hospital_id and str(log.hospital_id) == str(x_hospital_id)):
            display_name = log.hospital_name
        else:
            display_name = f"Secure Node {log.hospital_id}"
            
        log_responses.append(TrainingLogResponse(
            id=log.id,
            server_id=log.server_id,
            round_number=log.round_number,
            hospital_id=log.hospital_id,
            hospital_name=display_name,
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
        ))

    return TrainingStatus(
        server_id=server.id,
        server_name=server.name,
        status=server.status.value,
        current_round=server.current_round,
        total_rounds=server.num_rounds,
        global_accuracy=server.global_accuracy,
        participating_hospitals=member_count,
        logs=log_responses
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


# ─── Direct Full XGBoost Training (no FedAvg) ─────────────────────────────

@router.post("/train-full")
async def train_full_model(
    data: TrainingRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Train a single full XGBoost model on all server datasets (no federated averaging)."""
    result = await db.execute(select(DiseaseServer).where(DiseaseServer.id == data.server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.status == ServerStatus.TRAINING:
        raise HTTPException(status_code=400, detail="Training already in progress")

    ds_result = await db.execute(select(Dataset).where(Dataset.server_id == data.server_id))
    datasets = ds_result.scalars().all()
    if not datasets:
        raise HTTPException(status_code=400, detail="No datasets uploaded for this server")

    feature_columns = json.loads(server.feature_columns) if server.feature_columns else []
    target_column = server.target_column

    server.status = ServerStatus.TRAINING
    await db.commit()

    background_tasks.add_task(
        _run_full_xgboost_training,
        data.server_id,
        feature_columns,
        target_column,
        data.num_rounds or 100,   # use num_rounds as num_boost_round for XGBoost trees
    )

    return {
        "status": "training_started",
        "server_id": data.server_id,
        "message": f"Full XGBoost training started on {len(datasets)} dataset(s)"
    }


async def _run_full_xgboost_training(server_id: int, feature_columns: list, target_column: str, num_boost_round: int):
    """Background task: load all datasets, concat, train one XGBoost, save & log results."""
    import os
    import pandas as pd
    from app.db.session import AsyncSessionLocal
    from app.services.ai_service import train_local_model, save_model, preprocess_data
    from app.core import settings
    from sqlalchemy import delete, select, func
    import traceback
    import asyncio
    from functools import partial

    async with AsyncSessionLocal() as db:
        async def emit_log(msg: str, round_num: int = 0):
            l = TrainingLog(
                server_id=server_id,
                round_number=round_num,
                hospital_name="SYSTEM",
                log_type="info",
                details=msg
            )
            db.add(l)
            await db.commit()

        with open("training_debug.log", "a") as f_log:
            try:
                await emit_log("Initializing XGBoost Training...")
                f_log.write(f"\n--- Training session {server_id} started ---\n")
                f_log.flush()
                
                # Load all dataset file paths for this server
                print(f"[train-full] Starting training session for server {server_id}")
                f_log.write(f"Querying datasets for server {server_id}...\n")
                f_log.flush()
                
                ds_result = await db.execute(select(Dataset).where(Dataset.server_id == server_id))
                datasets = ds_result.scalars().all()
                await emit_log(f"Found {len(datasets)} datasets. Loading files...")
                print(f"[train-full] Found {len(datasets)} dataset(s)")
                f_log.write(f"Found {len(datasets)} datasets.\n")
                f_log.flush()

                dfs = []
                loop = asyncio.get_event_loop()
                for ds in datasets:
                    try:
                        fp = ds.file_path
                        f_log.write(f"Loading {fp}...\n")
                        f_log.flush()
                        if not os.path.exists(fp):
                            f_log.write(f"File {fp} does not exist!\n")
                            continue
                        
                        # Run blocking IO/Parsing in a thread
                        df = await loop.run_in_executor(None, partial(pd.read_csv, fp, sep=None, engine='python'))
                        
                        if df.shape[1] <= 1:
                            # Fallback if auto-detection failed but we suspect it's whitespace-split
                            df = await loop.run_in_executor(None, partial(pd.read_csv, fp, sep=r'\s+', engine='python'))

                        df = await loop.run_in_executor(None, preprocess_data, df, target_column)
                        dfs.append(df)
                        f_log.write(f"Loaded {fp} with shape {df.shape}\n")
                        f_log.flush()
                    except Exception as e:
                        f_log.write(f"Loaded {fp} with shape {df.shape}\n")
                        f_log.flush()
                    except Exception as e:
                        f_log.write(f"Error loading {ds.id}: {str(e)}\n")
                        f_log.flush()
                        print(f"[train-full] Could not load dataset {ds.id}: {e}")

                if not dfs:
                    raise ValueError("No readable datasets found (files might be empty or missing)")

                combined_df = await loop.run_in_executor(None, partial(pd.concat, dfs, ignore_index=True))
                print(f"[train-full] Combined data: {combined_df.shape[0]} rows, {combined_df.shape[1]} columns")
                f_log.write(f"Combined data shape: {combined_df.shape}\n")
                f_log.flush()

                # --- AUTO-REPAIR SCHEMA IF CORRUPTED ---
                # If target_column looks like a header or features are empty, re-detect
                if not feature_columns or len(target_column) > 50 or target_column not in combined_df.columns:
                    await emit_log("Schema mismatch detected. Auto-repairing server configuration...")
                    f_log.write("Malformed schema detected. Repairing...\n")
                    cols = list(combined_df.columns)
                    # Common target names
                    candidates = ['outcome', 'target', 'label', 'Outcome', 'class', 'diagnosis', 'diabetes', 'y']
                    new_target = None
                    for c in candidates:
                        if c in cols:
                            new_target = c
                            break
                    if not new_target:
                        new_target = cols[-1]
                    
                    target_column = new_target
                    feature_columns = [c for c in cols if c != target_column]
                    f_log.write(f"Repaired Schema -> Target: {target_column}, Features: {len(feature_columns)}\n")
                    
                    # Update server permanently
                    srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
                    server = srv_res.scalar_one()
                    server.target_column = target_column
                    server.feature_columns = json.dumps(feature_columns)
                    await db.commit()

                # Validate columns
                missing = [c for c in feature_columns + [target_column] if c not in combined_df.columns]
                if missing:
                    raise ValueError(f"Columns missing in data: {missing}")

                # Train full XGBoost
                print(f"[train-full] Starting XGBoost training (rounds={num_boost_round})...")
                f_log.write(f"Starting XGBoost training...\n")
                await emit_log(f"Training XGBoost Model ({num_boost_round} rounds)...")
                f_log.flush()
                
                # Execute heavy model training in a thread to avoid blocking the event loop
                model, metrics = await loop.run_in_executor(
                    None, 
                    partial(train_local_model, df=combined_df, feature_columns=feature_columns, target_column=target_column, num_boost_round=num_boost_round)
                )
                print(f"[train-full] Training complete. Accuracy: {metrics['accuracy']:.4f}")
                f_log.write(f"Training complete. Metrics: {metrics}\n")
                f_log.flush()

                # Create a mini history log
                hist = metrics.get('history', {}).get('eval', {}).get('logloss', [])
                hist_str = ""
                if hist:
                    hist_str = f"Loss History: {hist[0]:.4f} -> {hist[-1]:.4f} ({len(hist)} rounds)\n"

                save_model(model, server_id, round_num=0)
                f_log.write(f"Model saved.\n")
                f_log.flush()

                # Clear previous logs and write single-round result
                await db.execute(delete(TrainingLog).where(TrainingLog.server_id == server_id))
                log = TrainingLog(
                    server_id=server_id,
                    round_number=1,
                    hospital_id=None,
                    hospital_name="All Hospitals",
                    local_accuracy=metrics["accuracy"],
                    local_loss=metrics["loss"],
                    local_f1=metrics["f1"],
                    local_precision=metrics["precision"],
                    local_recall=metrics["recall"],
                    global_accuracy=metrics["accuracy"],
                    global_loss=metrics["loss"],
                    samples_trained=metrics["samples"],
                    log_type="global",
                    details=f"XGBoost Compiler Output:\n{hist_str}\nClassification Report:\n{metrics.get('report', '')}"
                )
                db.add(log)

                # Update server
                srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
                server = srv_res.scalar_one()
                server.status = ServerStatus.COMPLETED
                server.current_round = 1
                server.num_rounds = 1
                server.global_accuracy = metrics["accuracy"]
                await db.commit()
                f_log.write(f"Database updated successfully. Training session {server_id} COMPLETED.\n")
                f_log.flush()

            except Exception as e:
                err_msg = f"[train-full] CRITICAL ERROR: {str(e)}\n{traceback.format_exc()}"
                print(err_msg)
                f_log.write(err_msg + "\n")
                f_log.flush()
                srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
                server = srv_res.scalar_one()
                server.status = ServerStatus.ACTIVE
                await db.commit()
