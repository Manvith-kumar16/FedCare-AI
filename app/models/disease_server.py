from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class DiseaseServer(Base):
    __tablename__ = "disease_servers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    disease_type = Column(String(255), nullable=False)
    input_type = Column(String(50), nullable=False)
    model_type = Column(String(255), nullable=False)
    fl_algorithm = Column(String(50), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), nullable=False, default="inactive")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User")
    members = relationship("ServerMember", back_populates="server")
