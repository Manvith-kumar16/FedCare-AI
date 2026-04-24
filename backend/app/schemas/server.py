"""Server schemas"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ServerCreate(BaseModel):
    name: str
    disease_type: str
    description: Optional[str] = None
    input_type: str = "tabular"
    model_type: str = "xgboost"
    fl_algorithm: str = "FedAvg"
    num_rounds: int = 5
    target_column: str = "Outcome"
    
    model_config = {"protected_namespaces": ()}


class ServerUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    num_rounds: Optional[int] = None
    fl_algorithm: Optional[str] = None


class ServerResponse(BaseModel):
    id: int
    name: str
    disease_type: str
    description: Optional[str] = None
    input_type: str
    model_type: str
    fl_algorithm: str
    status: str
    num_rounds: int
    current_round: int
    global_accuracy: float
    target_column: str
    feature_columns: Optional[str] = None
    created_at: Optional[datetime] = None
    member_count: Optional[int] = 0
    dataset_count: Optional[int] = 0
    is_member: Optional[bool] = False
    member_status: Optional[str] = None

    model_config = {
        "from_attributes": True,
        "protected_namespaces": ()
    }


class ServerMemberResponse(BaseModel):
    id: int
    server_id: int
    hospital_id: int
    hospital_name: Optional[str] = None
    status: str
    last_accuracy: Optional[float] = 0.0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MemberJoin(BaseModel):
    server_id: int
    hospital_id: int
    hospital_name: str


class MemberUpdate(BaseModel):
    status: str
