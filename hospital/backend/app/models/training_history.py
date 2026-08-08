"""TrainingHistory model (hospital local)"""
from sqlalchemy import Integer, Float, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class TrainingHistory(Base, TimestampMixin):
    __tablename__ = "training_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    server_id: Mapped[int] = mapped_column(Integer, nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    local_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    local_loss: Mapped[float] = mapped_column(Float, default=0.0)
    local_f1: Mapped[float] = mapped_column(Float, default=0.0)
    local_precision: Mapped[float] = mapped_column(Float, default=0.0)
    local_recall: Mapped[float] = mapped_column(Float, default=0.0)
    samples_trained: Mapped[int] = mapped_column(Integer, default=0)
    details: Mapped[str] = mapped_column(Text, nullable=True)
