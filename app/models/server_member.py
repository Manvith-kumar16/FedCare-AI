from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class ServerMember(Base):
    __tablename__ = "server_members"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("disease_servers.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    server = relationship("DiseaseServer", back_populates="members")
