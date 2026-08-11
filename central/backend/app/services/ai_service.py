"""
FedCare AI Central — AI Service
Handles global model loading and inference for public users.
"""
import os
import pickle
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from app.core.config import settings

def _global_model_path(server_id: int) -> str:
    d = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
    return os.path.join(d, "global_model.pkl")

def load_global_model(server_id: int):
    path = _global_model_path(server_id)
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return pickle.load(f)

def predict_single(
    model,
    features: Dict[str, float],
    feature_columns: List[str],
) -> Dict:
    """
    Run inference on a single patient input.
    """
    input_vec = np.array([[float(features.get(col, 0.0)) for col in feature_columns]])
    input_df = pd.DataFrame(input_vec, columns=feature_columns)

    proba = model.predict_proba(input_df)[0]  # [prob_neg, prob_pos]
    prob_pos = float(proba[1])
    prob_neg = float(proba[0])
    prediction = int(prob_pos >= 0.5)
    confidence = float(max(prob_pos, prob_neg))

    return {
        "prediction": prediction,
        "prediction_label": "Positive" if prediction == 1 else "Negative",
        "confidence": confidence,
        "probability_positive": prob_pos,
        "probability_negative": prob_neg,
    }
