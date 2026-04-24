"""Dataset endpoints"""
import json
import os
import shutil
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.db import get_db
from app.models import Dataset, Hospital, DiseaseServer
from app.schemas.dataset import DatasetResponse, DatasetStats
from app.core import settings

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.get("/", response_model=List[DatasetResponse])
async def list_datasets(server_id: int = None, db: AsyncSession = Depends(get_db)):
    """Get all datasets, optionally filtered by server_id."""
    query = select(Dataset).order_by(Dataset.created_at.desc())
    if server_id:
        query = query.where(Dataset.server_id == server_id)

    result = await db.execute(query)
    datasets = result.scalars().all()

    response = []
    for ds in datasets:
        hosp_result = await db.execute(select(Hospital).where(Hospital.id == ds.hospital_id))
        hospital = hosp_result.scalar_one_or_none()

        response.append(DatasetResponse(
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
            hospital_name=hospital.name if hospital else None,
        ))

    return response


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    server_id: int = Form(...),
    hospital_id: int = Form(1),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload a new dataset for a hospital and server."""
    # Ensure server exists
    server_result = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = server_result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Validate file extension
    filename_lower = (file.filename or '').lower()
    if not (filename_lower.endswith('.csv') or filename_lower.endswith('.txt')):
        raise HTTPException(status_code=400, detail="Only .csv and .txt files are supported")

    # Create directories
    upload_dir = os.path.join(settings.DATA_DIR, f"hospital_{hospital_id}", f"server_{server_id}")
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    # Parse file for metadata (supports .csv and .txt with various delimiters)
    import asyncio
    from functools import partial
    loop = asyncio.get_event_loop()
    
    try:
        # Enhanced robust delimiter detection - Run in executor to avoid blocking loop
        def parse_data():
            try:
                df = pd.read_csv(file_path, sep=None, engine='python')
                if df.shape[1] <= 1:
                    for s in [',', '\t', ';', r'\s+']:
                        df = pd.read_csv(file_path, sep=s, engine='python')
                        if df.shape[1] > 1:
                            break
            except Exception:
                df = pd.read_csv(file_path)
            return df

        df = await loop.run_in_executor(None, parse_data)


        if df.shape[1] <= 1:
            raise ValueError("CSV/TXT parsing failed: Only one column detected. Please check delimiters (comma, tab, or space).")

        row_count = len(df)
        columns = list(df.columns)
        
        # Determine target column — auto-detect if configured name not in CSV
        configured_target = server.target_column  
        common_targets = [configured_target, 'target', 'outcome', 'Outcome', 'label', 'Label',
                          'class', 'Class', 'diagnosis', 'Diagnosis', 'result', 'Result', 'y']
        
        target_column = None
        for candidate in common_targets:
            if candidate and candidate in columns:
                target_column = candidate
                break
        
        if target_column is None:
            target_column = columns[-1]
        
        server.target_column = target_column
        feature_columns = [col for col in columns if col != target_column]
        feature_count = len(feature_columns)
        file_size_kb = round(os.path.getsize(file_path) / 1024, 2)
        server.feature_columns = json.dumps(feature_columns)
            
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Invalid CSV file: {str(e)}")


    # Create database record
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

    # Get hospital name
    hosp_result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hosp_result.scalar_one_or_none()

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
        hospital_name=hospital.name if hospital else "Local Hospital",
    )


@router.get("/stats", response_model=DatasetStats)
async def get_dataset_stats(server_id: int = 1, db: AsyncSession = Depends(get_db)):
    """Get aggregate statistics for datasets."""
    result = await db.execute(
        select(Dataset).where(Dataset.server_id == server_id)
    )
    datasets = result.scalars().all()

    if not datasets:
        return DatasetStats(
            total_datasets=0, total_rows=0, total_hospitals=0,
            columns=[], per_hospital=[]
        )

    total_rows = sum(ds.row_count for ds in datasets)
    hospital_ids = set(ds.hospital_id for ds in datasets)
    
    try:
        columns = json.loads(datasets[0].columns) if datasets[0].columns else []
    except:
        columns = []

    per_hospital = []
    # Deduplicate by hospital and sum rows
    hosp_summary = {}
    for ds in datasets:
        if ds.hospital_id not in hosp_summary:
            hosp_result = await db.execute(select(Hospital).where(Hospital.id == ds.hospital_id))
            hospital = hosp_result.scalar_one_or_none()
            hosp_summary[ds.hospital_id] = {
                "hospital_id": ds.hospital_id,
                "hospital_name": hospital.name if hospital else f"Hospital {ds.hospital_id}",
                "rows": 0,
                "filename": ds.filename,
                "size_kb": 0
            }
        hosp_summary[ds.hospital_id]["rows"] += ds.row_count
        hosp_summary[ds.hospital_id]["size_kb"] += ds.file_size_kb

    per_hospital = list(hosp_summary.values())

    return DatasetStats(
        total_datasets=len(datasets),
        total_rows=total_rows,
        total_hospitals=len(hospital_ids),
        columns=columns,
        per_hospital=per_hospital,
    )


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific dataset."""
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    hosp_result = await db.execute(select(Hospital).where(Hospital.id == ds.hospital_id))
    hospital = hosp_result.scalar_one_or_none()

    return DatasetResponse(
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
        hospital_name=hospital.name if hospital else None,
    )


@router.get("/{dataset_id}/preview")
async def preview_dataset(dataset_id: int, rows: int = 10, db: AsyncSession = Depends(get_db)):
    """Preview first N rows of a dataset."""
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        df = pd.read_csv(ds.file_path, nrows=rows)
        return {
            "columns": list(df.columns),
            "rows": df.to_dict(orient="records"),
            "total_rows": ds.row_count,
            "shape": [ds.row_count, ds.feature_count + 1],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading dataset: {str(e)}")

@router.delete("/clear/{server_id}")
async def clear_datasets(server_id: int, db: AsyncSession = Depends(get_db)):
    """Delete all datasets for a server to permit a fresh start with real data."""
    # Delete database records
    from sqlalchemy import delete
    await db.execute(delete(Dataset).where(Dataset.server_id == server_id))
    
    # Delete physical files
    for hid in range(1, 10): # Clean up common hospital IDs
        target_dir = os.path.join(settings.DATA_DIR, f"hospital_{hid}", f"server_{server_id}")
        if os.path.exists(target_dir):
            try:
                shutil.rmtree(target_dir)
            except Exception as e:
                print(f"Error deleting dir {target_dir}: {e}")
    
    await db.commit()
    return {"message": "All datasets and files cleared for this server."}
