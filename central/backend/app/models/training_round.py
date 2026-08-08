"""TrainingRound model"""
from sqlalchemy import Integer, ForeignKey, Enum as SAEnum, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column
import enum
from datetime import datetime
from app.models.base import Base, TimestampMixin


class RoundStatus(str, enum.Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class TrainingRound(Base, TimestampMixin):
    __tablename__ = "training_rounds"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("disease_servers.id"), nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[RoundStatus] = mapped_column(SAEnum(RoundStatus), default=RoundStatus.RUNNING)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Global metrics computed from aggregation/distributed validation
    global_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    global_precision: Mapped[float] = mapped_column(Float, default=0.0)
    global_recall: Mapped[float] = mapped_column(Float, default=0.0)
    global_f1: Mapped[float] = mapped_column(Float, default=0.0)
    global_auc: Mapped[float] = mapped_column(Float, default=0.0)
