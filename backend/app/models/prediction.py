"""Prediction model"""
from sqlalchemy import Integer, ForeignKey, Float, Text, String
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class Prediction(Base, TimestampMixin):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("disease_servers.id"), nullable=False)
    input_data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string
    prediction: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 or 1
    prediction_label: Mapped[str] = mapped_column(String(255), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    probability_positive: Mapped[float] = mapped_column(Float, default=0.0)
    probability_negative: Mapped[float] = mapped_column(Float, default=0.0)
    explanation_data: Mapped[str] = mapped_column(Text, nullable=True)  # JSON SHAP values
    feature_importance: Mapped[str] = mapped_column(Text, nullable=True)  # JSON feature importance
