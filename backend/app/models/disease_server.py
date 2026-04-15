"""Disease Server model"""
from sqlalchemy import String, Integer, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column
import enum
from app.models.base import Base, TimestampMixin


class ServerStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    TRAINING = "TRAINING"
    COMPLETED = "COMPLETED"


class InputType(str, enum.Enum):
    TABULAR = "tabular"
    IMAGE = "image"
    AUDIO = "audio"
    TEXT = "text"


class ModelType(str, enum.Enum):
    XGBOOST = "xgboost"
    CNN = "cnn"
    RESNET = "resnet"
    RANDOM_FOREST = "random_forest"
    LSTM = "lstm"


class FLAlgorithm(str, enum.Enum):
    FEDAVG = "FedAvg"
    FEDPROX = "FedProx"


class DiseaseServer(Base, TimestampMixin):
    __tablename__ = "disease_servers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    disease_type: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    input_type: Mapped[InputType] = mapped_column(SAEnum(InputType), default=InputType.TABULAR)
    model_type: Mapped[ModelType] = mapped_column(SAEnum(ModelType), default=ModelType.XGBOOST)
    fl_algorithm: Mapped[FLAlgorithm] = mapped_column(SAEnum(FLAlgorithm), default=FLAlgorithm.FEDAVG)
    status: Mapped[ServerStatus] = mapped_column(SAEnum(ServerStatus), default=ServerStatus.ACTIVE)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    num_rounds: Mapped[int] = mapped_column(Integer, default=5)
    current_round: Mapped[int] = mapped_column(Integer, default=0)
    global_accuracy: Mapped[float] = mapped_column(default=0.0)
    target_column: Mapped[str] = mapped_column(String(255), default="Outcome")
    feature_columns: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string of feature names
