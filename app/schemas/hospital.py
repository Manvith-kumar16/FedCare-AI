from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HospitalCreate(BaseModel):
    name: str
    admin_id: int


class HospitalRead(BaseModel):
    id: int
    name: str
    admin_id: int
    created_at: Optional[datetime]

    class Config:
        orm_mode = True
