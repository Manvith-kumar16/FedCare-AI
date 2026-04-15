"""Prediction schemas"""
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


from pydantic import BaseModel, Field, field_validator

class PredictionInput(BaseModel):
    server_id: int = Field(..., description="ID of the disease server")
    Pregnancies: float = Field(..., ge=0, le=20, description="Number of pregnancies")
    Glucose: float = Field(..., ge=0, le=300, description="Plasma glucose concentration")
    BloodPressure: float = Field(..., ge=0, le=200, description="Diastolic blood pressure (mm Hg)")
    SkinThickness: float = Field(..., ge=0, le=100, description="Triceps skin fold thickness (mm)")
    Insulin: float = Field(..., ge=0, le=1000, description="2-Hour serum insulin (mu U/ml)")
    BMI: float = Field(..., ge=0, le=70, description="Body mass index (weight in kg/(height in m)^2)")
    DiabetesPedigreeFunction: float = Field(..., ge=0, le=3.0, description="Diabetes pedigree function")
    Age: float = Field(..., ge=0, le=120, description="Age (years)")

    @field_validator("Glucose", "BloodPressure", "BMI", "Age")
    @classmethod
    def validate_non_zero(cls, v):
        if v <= 0:
            raise ValueError("Value must be greater than zero for clinical assessment")
        return v


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
