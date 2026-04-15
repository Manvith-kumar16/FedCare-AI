"""AI Service - XGBoost training and prediction for tabular data"""
import os
import json
import pickle
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, log_loss
from sklearn.preprocessing import StandardScaler
from typing import Dict, Tuple, List, Optional
from app.core import settings


FEATURE_COLUMNS = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"
]
TARGET_COLUMN = "Outcome"


def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    """Preprocess diabetes dataset - handle missing values encoded as 0."""
    df = df.copy()
    # Columns where 0 is biologically implausible (treat as missing)
    zero_as_missing = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]
    for col in zero_as_missing:
        if col in df.columns:
            df[col] = df[col].replace(0, np.nan)
            df[col] = df[col].fillna(df[col].median())
    return df


def load_hospital_data(hospital_id: int, server_id: int) -> Optional[pd.DataFrame]:
    """Load dataset for a specific hospital."""
    data_dir = os.path.join(settings.DATA_DIR, f"hospital_{hospital_id}", f"server_{server_id}")
    if not os.path.exists(data_dir):
        # Try legacy path
        data_dir = os.path.join(settings.DATA_DIR, f"hospital_{hospital_id}")
    if not os.path.exists(data_dir):
        return None

    csv_files = [f for f in os.listdir(data_dir) if f.endswith('.csv')]
    if not csv_files:
        return None

    df = pd.read_csv(os.path.join(data_dir, csv_files[0]))
    return preprocess_data(df)


def train_local_model(
    df: pd.DataFrame,
    params: Optional[Dict] = None,
    num_boost_round: int = 50,
    existing_model: Optional[xgb.Booster] = None
) -> Tuple[xgb.Booster, Dict[str, float]]:
    """Train XGBoost model on local hospital data."""
    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=FEATURE_COLUMNS)
    dval = xgb.DMatrix(X_val, label=y_val, feature_names=FEATURE_COLUMNS)

    if params is None:
        params = {
            "objective": "binary:logistic",
            "eval_metric": "logloss",
            "max_depth": 4,
            "learning_rate": 0.1,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "min_child_weight": 3,
            "seed": 42,
        }

    model = xgb.train(
        params,
        dtrain,
        num_boost_round=num_boost_round,
        evals=[(dval, "eval")],
        verbose_eval=False,
        xgb_model=existing_model,
    )

    # Evaluate
    y_pred_proba = model.predict(dval)
    y_pred = (y_pred_proba > 0.5).astype(int)

    metrics = {
        "accuracy": float(accuracy_score(y_val, y_pred)),
        "f1": float(f1_score(y_val, y_pred, zero_division=0)),
        "precision": float(precision_score(y_val, y_pred, zero_division=0)),
        "recall": float(recall_score(y_val, y_pred, zero_division=0)),
        "loss": float(log_loss(y_val, y_pred_proba)),
        "samples": len(X_train),
    }

    return model, metrics


def predict_single(model: xgb.Booster, features: Dict[str, float]) -> Dict:
    """Make prediction for a single input."""
    input_array = np.array([[features.get(col, 0) for col in FEATURE_COLUMNS]])
    dmatrix = xgb.DMatrix(input_array, feature_names=FEATURE_COLUMNS)
    proba = model.predict(dmatrix)[0]

    prediction = 1 if proba > 0.5 else 0
    return {
        "prediction": prediction,
        "prediction_label": "Diabetic" if prediction == 1 else "Non-Diabetic",
        "confidence": float(max(proba, 1 - proba)),
        "probability_positive": float(proba),
        "probability_negative": float(1 - proba),
    }


def save_model(model: xgb.Booster, server_id: int, round_num: int = 0):
    """Save model checkpoint."""
    model_dir = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
    os.makedirs(model_dir, exist_ok=True)
    path = os.path.join(model_dir, f"global_model_round_{round_num}.json")
    model.save_model(path)
    # Also save as latest
    latest_path = os.path.join(model_dir, "global_model_latest.json")
    model.save_model(latest_path)
    return path


def load_model(server_id: int, round_num: Optional[int] = None) -> Optional[xgb.Booster]:
    """Load model from checkpoint."""
    model_dir = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
    if round_num is not None:
        path = os.path.join(model_dir, f"global_model_round_{round_num}.json")
    else:
        path = os.path.join(model_dir, "global_model_latest.json")

    if not os.path.exists(path):
        return None

    model = xgb.Booster()
    model.load_model(path)
    return model


def get_model_params(model: xgb.Booster) -> bytes:
    """Extract model parameters as bytes for FL aggregation."""
    return model.save_raw("json")


def set_model_params(raw_params: bytes) -> xgb.Booster:
    """Create model from raw parameters."""
    model = xgb.Booster()
    model.load_model(bytearray(raw_params))
    return model
