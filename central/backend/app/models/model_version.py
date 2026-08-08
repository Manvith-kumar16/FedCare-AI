"""ModelVersion model"""
from sqlalchemy import String, Integer, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class ModelVersion(Base, TimestampMixin):
    __tablename__ = "model_versions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("disease_servers.id"), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    model_path: Mapped[str] = mapped_column(String(500), nullable=False)
    model_hash: Mapped[str] = mapped_column(String(64), nullable=False) # SHA-256 hash
    metrics_json: Mapped[str] = mapped_column(Text, nullable=True) # JSON representation of global metrics
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
