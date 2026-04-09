from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DiseaseServerCreate(BaseModel):
    name: str
    disease_type: str
    input_type: str
    model_type: str
    fl_algorithm: str


class DiseaseServerRead(BaseModel):
    id: int
    name: str
    disease_type: str
    input_type: str
    model_type: str
    fl_algorithm: str
    created_by: int
    status: str
    created_at: Optional[datetime]

    class Config:
        orm_mode = True


class ServerMemberRead(BaseModel):
    id: int
    server_id: int
    hospital_id: int
    status: str
    joined_at: Optional[datetime]

    class Config:
        orm_mode = True
