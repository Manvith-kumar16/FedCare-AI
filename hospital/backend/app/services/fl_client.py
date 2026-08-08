"""Federated Client service (hospital local)"""
import os
import json
import urllib.request
import urllib.error
import logging
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Callable, Optional, Tuple
from app.core import settings
from app.models.dataset import Dataset
from app.models.training_history import TrainingHistory
from app.services.ai_service import train_local_model

logger = logging.getLogger("fedcare-hospital")


def encode_multipart_formdata(fields: dict, files: dict) -> Tuple[bytes, str]:
    """
    Encode form fields and files into multipart/form-data payload.
    Provides multipart file upload capability using Python standard library.
    """
    boundary = "----FedCareFormBoundary" + os.urandom(8).hex()
    body = []
    
    # Text fields
    for key, val in fields.items():
        body.append(f"--{boundary}".encode())
        body.append(f'Content-Disposition: form-data; name="{key}"'.encode())
        body.append(b"")
        body.append(str(val).encode())
        
    # Files
    for key, (filename, file_bytes) in files.items():
        body.append(f"--{boundary}".encode())
        body.append(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"'.encode())
        body.append(b"Content-Type: application/octet-stream")
        body.append(b"")
        body.append(file_bytes)
        
    body.append(f"--{boundary}--".encode())
    body.append(b"")
    
    content_type = f"multipart/form-data; boundary={boundary}"
    return b"\r\n".join(body), content_type


async def check_and_run_federated_round(
    db: AsyncSession,
    auth_token: str,
    log_callback: Optional[Callable] = None
) -> dict:
    """
    Core local loop:
    1. Query Central Coordinator for active rounds.
    2. Download global model version.
    3. Run local training and evaluation.
    4. Post update file and validation metrics back to central.
    """
    def log(msg):
        logger.info(msg)
        if log_callback:
            log_callback(msg)

    log("Checking central coordinator for active training rounds...")
    
    # 1. Fetch active rounds from central coordinator
    url = f"{settings.CENTRAL_API_URL}/api/v1/federated/rounds/active"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {auth_token}")
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            active_rounds = json.loads(response.read().decode("utf-8"))
    except Exception as e:
        err = f"Failed to connect to central coordinator: {e}"
        log(err)
        return {"error": err}
        
    if not active_rounds:
        log("No active training rounds currently registered for this hospital node.")
        return {"status": "idle", "message": "No active rounds"}

    participated_rounds = []
    
    for rd in active_rounds:
        server_id = rd["server_id"]
        round_number = rd["round_number"]
        round_id = rd["round_id"]
        model_type = rd["model_type"]
        target_column = rd["target_column"]
        has_submitted = rd["has_submitted"]
        
        log(f"Found active training session: Server {server_id} ({rd['server_name']}), Round {round_number}")
        
        if has_submitted:
            log("Already submitted update for this round. Waiting for aggregation...")
            continue

        # 2. Get local dataset for this server
        ds_res = await db.execute(
            select(Dataset).where(
                and_(
                    Dataset.server_id == server_id,
                    Dataset.hospital_id == settings.HOSPITAL_ID
                )
            )
        )
        dataset = ds_res.scalars().first()
        if not dataset:
            log(f"⚠️ No local dataset uploaded for Server {server_id} on this node. Please upload a dataset first.")
            continue
            
        # 3. Download Global Model weights
        log(f"Downloading current global model from coordinator...")
        dl_url = f"{settings.CENTRAL_API_URL}/api/v1/federated/global-model/{server_id}"
        dl_req = urllib.request.Request(dl_url, method="GET")
        dl_req.add_header("Authorization", f"Bearer {auth_token}")
        
        try:
            with urllib.request.urlopen(dl_req, timeout=15) as dl_resp:
                global_weights = dl_resp.read()
                # Get version metadata from headers
                g_version = dl_resp.getheader("X-Model-Version", "v0")
                g_hash = dl_resp.getheader("X-Model-Hash", "")
                log(f"Global model downloaded. Version: {g_version}. Hash: {g_hash[:8]}...")
        except Exception as e:
            log(f"❌ Error downloading global model: {e}")
            continue

        # Save the global model locally inside hospital's model cache
        local_global_dir = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
        os.makedirs(local_global_dir, exist_ok=True)
        global_model_path = os.path.join(local_global_dir, "global_model.pkl")
        with open(global_model_path, "wb") as f:
            f.write(global_weights)

        # 4. Perform local training
        log(f"Starting local training on dataset '{dataset.filename}'...")
        try:
            # We train locally on the downloaded model framework, or train a new local model
            # and output the parameters. We run 10 epochs.
            model, metrics = train_local_model(
                file_path=dataset.file_path,
                target_column=target_column,
                hospital_id=settings.HOSPITAL_ID,
                server_id=server_id,
                model_type=model_type,
                epochs=settings.FL_LOCAL_EPOCHS,
                log_callback=log
            )
        except Exception as e:
            log(f"❌ Local training failed: {e}")
            continue

        # Get saved local model path
        local_model_path = os.path.join(local_global_dir, f"local_model_{settings.HOSPITAL_ID}.pkl")
        if not os.path.exists(local_model_path):
            log("❌ Local model update file not found on disk")
            continue

        # Read local model update binary
        with open(local_model_path, "rb") as f:
            model_bytes = f.read()

        # 5. Submit update back to Central Coordinator
        log("Uploading model update & local validation metrics to central coordinator...")
        up_url = f"{settings.CENTRAL_API_URL}/api/v1/federated/model-update"
        
        fields = {
            "server_id": server_id,
            "round_number": round_number,
            "sample_count": dataset.row_count,
            "local_metrics": json.dumps({
                "accuracy": metrics["accuracy"],
                "precision": metrics["precision"],
                "recall": metrics["recall"],
                "f1": metrics["f1"],
                "loss": metrics["loss"],
                "auc": metrics.get("auc", 0.0)
            })
        }
        
        files = {
            "file": (f"update_hosp_{settings.HOSPITAL_ID}.pkl", model_bytes)
        }
        
        body, content_type = encode_multipart_formdata(fields, files)
        
        up_req = urllib.request.Request(up_url, data=body, method="POST")
        up_req.add_header("Authorization", f"Bearer {auth_token}")
        up_req.add_header("Content-Type", content_type)
        
        try:
            with urllib.request.urlopen(up_req, timeout=20) as up_resp:
                res_body = json.loads(up_resp.read().decode("utf-8"))
                log(f"✅ Model update accepted by coordinator! Status: {res_body.get('status')}")
        except Exception as e:
            log(f"❌ Failed to submit model update: {e}")
            continue

        # 6. Save locally in training history
        hist = TrainingHistory(
            server_id=server_id,
            round_number=round_number,
            local_accuracy=metrics["accuracy"],
            local_loss=metrics["loss"],
            local_f1=metrics["f1"],
            local_precision=metrics["precision"],
            local_recall=metrics["recall"],
            samples_trained=dataset.row_count,
            details=f"Participated in federated round {round_number}. Submitted model update. Hash: {res_body.get('hash')}"
        )
        db.add(hist)
        await db.commit()
        participated_rounds.append(round_number)
        
    return {
        "status": "completed",
        "participated_rounds": participated_rounds
    }
