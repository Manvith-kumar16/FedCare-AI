"""Dataset schemas"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DatasetResponse(BaseModel):
    id: int
    hospital_id: int
    server_id: int
    filename: str
    file_path: str
    row_count: int
    feature_count: int
    columns: Optional[str] = None
    target_column: str
    file_size_kb: float
    created_at: Optional[datetime] = None
    hospital_name: Optional[str] = None

    class Config:
        from_attributes = True


class DatasetStats(BaseModel):
    total_datasets: int
    total_rows: int
    total_hospitals: int
    columns: List[str]
    per_hospital: List[dict]
