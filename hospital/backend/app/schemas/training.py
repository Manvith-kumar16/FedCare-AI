"""Training schemas (hospital local)"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class LocalTrainingRequest(BaseModel):
    server_id: int
    epochs: Optional[int] = 10


class LocalTrainingHistoryResponse(BaseModel):
    id: int
    server_id: int
    round_number: int
    local_accuracy: float
    local_loss: float
    local_f1: float
    local_precision: float
    local_recall: float
    samples_trained: int
    details: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
