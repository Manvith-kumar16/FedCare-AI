"""Training schemas"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TrainingRequest(BaseModel):
    server_id: int
    num_rounds: Optional[int] = 5
    local_epochs: Optional[int] = 10


class TrainingLogResponse(BaseModel):
    id: int
    server_id: int
    round_number: int
    hospital_id: Optional[int] = None
    hospital_name: Optional[str] = None
    local_accuracy: float
    local_loss: float
    local_f1: float
    local_precision: float
    local_recall: float
    global_accuracy: float
    global_loss: float
    samples_trained: int
    log_type: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TrainingStatus(BaseModel):
    server_id: int
    server_name: str
    status: str
    current_round: int
    total_rounds: int
    global_accuracy: float
    participating_hospitals: int
    logs: List[TrainingLogResponse]


class TrainingMetrics(BaseModel):
    round_number: int
    global_accuracy: float
    global_loss: float
    hospital_metrics: List[dict]
