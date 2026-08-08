"""ModelUpdate model"""
from sqlalchemy import String, Integer, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum
from app.models.base import Base, TimestampMixin


class UpdateStatus(str, enum.Enum):
    VALIDATED = "VALIDATED"
    AGGREGATED = "AGGREGATED"
    FAILED = "FAILED"


class ModelUpdate(Base, TimestampMixin):
    __tablename__ = "model_updates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("training_rounds.id"), nullable=False)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id"), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    update_path: Mapped[str] = mapped_column(String(500), nullable=False)
    update_hash: Mapped[str] = mapped_column(String(64), nullable=False) # SHA-256 hash of the uploaded .pkl
    local_metrics_json: Mapped[str] = mapped_column(Text, nullable=True) # local validation metrics
    status: Mapped[UpdateStatus] = mapped_column(SAEnum(UpdateStatus), default=UpdateStatus.VALIDATED)
