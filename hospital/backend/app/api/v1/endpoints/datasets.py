"""Dataset endpoints (hospital local)"""
import json
import os
import shutil
import urllib.request
import urllib.error
import pandas as pd
import numpy as np
import zipfile
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db import get_db
from app.models.dataset import Dataset
from app.schemas.dataset import DatasetResponse, DatasetStats
from app.core import settings
from app.api.deps import get_current_hospital_user

router = APIRouter(prefix="/datasets", tags=["Datasets"])


def fetch_server_schema_from_central(server_id: int, token: str) -> dict:
    """Fetch expected target and feature columns from central coordinator."""
    url = f"{settings.CENTRAL_API_URL}/api/v1/servers/{server_id}"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.getcode() == 200:
                return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Error fetching server schema from central: {e}")
    return {}


@router.get("/", response_model=List[DatasetResponse])
async def list_datasets(
    server_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_hospital_user)
):
    """List datasets uploaded to this hospital node."""
    query = select(Dataset).where(Dataset.hospital_id == current_user["hospital_id"]).order_by(Dataset.created_at.desc())
    if server_id:
        query = query.where(Dataset.server_id == server_id)

    result = await db.execute(query)
    datasets = result.scalars().all()

    return [
        DatasetResponse(
            id=ds.id,
            hospital_id=ds.hospital_id,
            server_id=ds.server_id,
            filename=ds.filename,
            file_path=ds.file_path,
            row_count=ds.row_count,
            feature_count=ds.feature_count,
            columns=ds.columns,
            target_column=ds.target_column,
            file_size_kb=ds.file_size_kb,
            created_at=ds.created_at,
            hospital_name=f"Hospital Node {current_user['hospital_id']}"
        )
        for ds in datasets
    ]


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    server_id: int = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_hospital_user)
):
    """Upload a new dataset locally to this hospital node."""
    # Validate file extension
    filename_lower = (file.filename or '').lower()
    if not (filename_lower.endswith('.csv') or filename_lower.endswith('.txt') or filename_lower.endswith('.zip')):
        raise HTTPException(status_code=400, detail="Only .csv, .txt, and .zip files are supported")

    hospital_id = current_user["hospital_id"]

    # Save directories inside hospital local storage
    upload_dir = os.path.join(settings.DATA_DIR, f"hospital_{hospital_id}", f"server_{server_id}")
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)
    
    # Save file locally
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file locally: {str(e)}")

    try:
        if filename_lower.endswith('.zip'):
            # Handle Image Dataset
            extract_dir = file_path.replace('.zip', '')
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            # Count images
            image_extensions = {'.png', '.jpg', '.jpeg'}
            row_count = 0
            for path in Path(extract_dir).rglob('*'):
                if path.suffix.lower() in image_extensions:
                    row_count += 1
            
            if row_count == 0:
                raise ValueError("No images found in the ZIP file.")
                
            columns = ["Image"]
            target_column = "Image Class"
            feature_count = 1
            file_size_kb = round(os.path.getsize(file_path) / 1024, 2)
            
        else:
            # Load CSV using pandas and auto-detect columns/structure
            try:
                df = pd.read_csv(file_path, sep=None, engine='python')
                if df.shape[1] <= 1:
                    for s in [',', '\t', ';', r'\s+']:
                        df = pd.read_csv(file_path, sep=s, engine='python')
                        if df.shape[1] > 1:
                            break
            except Exception:
                df = pd.read_csv(file_path)

            if df.shape[1] <= 1:
                raise ValueError("CSV/TXT parsing failed: Only one column detected.")

            row_count = len(df)
            columns = list(df.columns)
            
            # Simple local auto-target detection
            target_candidates = ['outcome', 'Outcome', 'target', 'Target', 'label', 'Label', 'class', 'Class', 'y']
            target_column = None
            for candidate in target_candidates:
                if candidate in columns:
                    target_column = candidate
                    break
            if target_column is None:
                target_column = columns[-1]
                
            feature_count = len([c for c in columns if c != target_column])
            file_size_kb = round(os.path.getsize(file_path) / 1024, 2)

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Invalid file: {str(e)}")

    # Add record to local DB
    dataset = Dataset(
        hospital_id=hospital_id,
        server_id=server_id,
        filename=file.filename,
        file_path=file_path,
        row_count=row_count,
        feature_count=feature_count,
        columns=json.dumps(columns),
        target_column=target_column,
        file_size_kb=file_size_kb
    )
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)

    return DatasetResponse(
        id=dataset.id,
        hospital_id=dataset.hospital_id,
        server_id=dataset.server_id,
        filename=dataset.filename,
        file_path=dataset.file_path,
        row_count=dataset.row_count,
        feature_count=dataset.feature_count,
        columns=dataset.columns,
        target_column=dataset.target_column,
        file_size_kb=dataset.file_size_kb,
        created_at=dataset.created_at,
        hospital_name=f"Hospital Node {hospital_id}"
    )


@router.post("/validate/{dataset_id}")
async def validate_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_hospital_user)
):
    """
    Perform deep local validation on a dataset:
    - Missing values
    - Duplicates
    - Columns alignment with target
    - Class balance
    - Data types
    """
    result = await db.execute(
        select(Dataset).where(
            Dataset.id == dataset_id,
            Dataset.hospital_id == current_user["hospital_id"]
        )
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found on this hospital node")

    if not os.path.exists(ds.file_path):
        raise HTTPException(status_code=404, detail="Physical dataset file is missing")

    try:
        df = pd.read_csv(ds.file_path)
        
        # Missing values
        missing = df.isnull().sum().to_dict()
        total_missing = sum(missing.values())
        
        # Duplicates
        duplicates = int(df.duplicated().sum())
        
        # Data types
        types = {col: str(t) for col, t in df.dtypes.items()}
        
        # Class distribution of target
        target = ds.target_column
        class_dist = {}
        if target in df.columns:
            class_counts = df[target].value_counts().to_dict()
            class_dist = {str(k): int(v) for k, v in class_counts.items()}
            
        validation_report = {
            "dataset_id": ds.id,
            "filename": ds.filename,
            "row_count": len(df),
            "feature_count": len(df.columns) - (1 if target in df.columns else 0),
            "missing_values": {
                "total": total_missing,
                "by_column": missing
            },
            "duplicates": duplicates,
            "data_types": types,
            "class_distribution": class_dist,
            "status": "valid" if total_missing == 0 else "warning_missing_values"
        }
        return validation_report
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error validating dataset: {str(e)}")


@router.get("/{dataset_id}/preview")
async def preview_dataset(
    dataset_id: int,
    rows: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_hospital_user)
):
    """Preview first N rows of a dataset locally."""
    result = await db.execute(
        select(Dataset).where(
            Dataset.id == dataset_id,
            Dataset.hospital_id == current_user["hospital_id"]
        )
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found on this hospital node")

    try:
        df = pd.read_csv(ds.file_path, nrows=rows)
        # Handle nan/inf for json compatibility
        df = df.replace([np.inf, -np.inf], np.nan).fillna("")
        return {
            "columns": list(df.columns),
            "rows": df.to_dict(orient="records"),
            "total_rows": ds.row_count,
            "shape": [ds.row_count, ds.feature_count + 1],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading dataset: {str(e)}")


@router.delete("/clear/{server_id}")
async def clear_datasets(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_hospital_user)
):
    """Delete all local datasets for a server to permit fresh starts."""
    hospital_id = current_user["hospital_id"]
    query = select(Dataset).where(
        Dataset.server_id == server_id,
        Dataset.hospital_id == hospital_id
    )
    result = await db.execute(query)
    datasets = result.scalars().all()

    for ds in datasets:
        if os.path.exists(ds.file_path):
            try:
                os.remove(ds.file_path)
            except Exception:
                pass
        await db.delete(ds)

    await db.commit()
    
    # Delete folder
    target_dir = os.path.join(settings.DATA_DIR, f"hospital_{hospital_id}", f"server_{server_id}")
    if os.path.exists(target_dir):
        try:
            shutil.rmtree(target_dir)
        except Exception:
            pass

    return {"message": f"Local datasets cleared for server {server_id}."}
