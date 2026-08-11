from pydantic import BaseModel
from typing import Dict, Any, List

class PredictionInput(BaseModel):
    server_id: int
    features: Dict[str, float]

class PredictionResponse(BaseModel):
    prediction: int
    prediction_label: str
    confidence: float
    probability_positive: float
    probability_negative: float

class ExplanationResponse(BaseModel):
    prediction_id: int
    prediction_label: str
    confidence: float
    feature_names: List[str]
    shap_values: List[float]
    base_value: float
