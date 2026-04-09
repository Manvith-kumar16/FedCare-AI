from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("disease_servers.id"), nullable=False)
    model_type = Column(String(50), nullable=False)
    input_path = Column(String(1024), nullable=True)
    model_path = Column(String(1024), nullable=True)
    label = Column(String(255), nullable=True)
    confidence = Column(String(255), nullable=True)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    server = relationship("DiseaseServer")
