"""Prediction schemas"""
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


from pydantic import BaseModel, Field, field_validator

class PredictionInput(BaseModel):
    server_id: int = Field(..., description="ID of the disease server")
    features: Dict[str, float] = Field(..., description="Key-value pairs of feature names and their values")


class PredictionResponse(BaseModel):
    id: int
    server_id: int
    prediction: int
    prediction_label: str
    confidence: float
    probability_positive: float
    probability_negative: float
    input_data: Optional[str] = None
    explanation_data: Optional[str] = None
    feature_importance: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExplanationResponse(BaseModel):
    prediction_id: int
    prediction_label: str
    confidence: float
    shap_values: Dict[str, float]
    feature_importance: List[Dict[str, float]]
    base_value: float
    plot_base64: Optional[str] = None
