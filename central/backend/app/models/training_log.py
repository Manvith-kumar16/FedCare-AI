"""Training log model"""
from sqlalchemy import String, Integer, ForeignKey, Float, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class TrainingLog(Base, TimestampMixin):
    __tablename__ = "training_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("disease_servers.id"), nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id"), nullable=True)
    hospital_name: Mapped[str] = mapped_column(String(255), nullable=True)
    local_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    local_loss: Mapped[float] = mapped_column(Float, default=0.0)
    local_f1: Mapped[float] = mapped_column(Float, default=0.0)
    local_precision: Mapped[float] = mapped_column(Float, default=0.0)
    local_recall: Mapped[float] = mapped_column(Float, default=0.0)
    global_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    global_loss: Mapped[float] = mapped_column(Float, default=0.0)
    samples_trained: Mapped[int] = mapped_column(Integer, default=0)
    log_type: Mapped[str] = mapped_column(String(50), default="local")  # "local" or "global"
    details: Mapped[str] = mapped_column(Text, nullable=True)  # JSON additional info
