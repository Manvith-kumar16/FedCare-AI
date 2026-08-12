"""
FedCare AI Central — Federated Learning Aggregator/Coordinator
"""
import os
import pickle
import numpy as np
import json
import logging
import torch
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from typing import List, Dict, Tuple
from app.core import settings
from app.models.model_update import ModelUpdate

logger = logging.getLogger("fedcare-central")


# ─── XGBoost Ensemble Class Wrapper ──────────────────────────────────────────

class FederatedEnsembleClassifier:
    """
    Technically valid federated ensemble aggregation wrapper for XGBoost.
    Wraps multiple local XGBoost models and averages their probability predictions.
    Avoids combining raw patient datasets at the central server.
    """
    def __init__(self, models: List[XGBClassifier], weights: List[float], feature_names: List[str]):
        self.models = models
        self.weights = np.array(weights) / sum(weights) if weights else np.array([])
        self.feature_names_in_ = np.array(feature_names)
        self.classes_ = np.array([0, 1])

    def predict_proba(self, X) -> np.ndarray:
        """Weighted average of prediction probabilities from each local model."""
        if not self.models:
            raise ValueError("No models in the ensemble.")
        
        # Gather probas from each model
        probas = []
        for model in self.models:
            # Predict probability of positive class
            p = model.predict_proba(X)
            probas.append(p)
            
        # Weighted sum of probabilities
        weighted_probas = np.zeros_like(probas[0])
        for p, w in zip(probas, self.weights):
            weighted_probas += p * w
            
        return weighted_probas

    def predict(self, X) -> np.ndarray:
        """Predict class labels by thresholding the averaged probability."""
        probas = self.predict_proba(X)
        return (probas[:, 1] >= 0.5).astype(int)


# ─── Aggregation Routines ─────────────────────────────────────────────────────

def aggregate_logistic_regression(
    updates: List[ModelUpdate]
) -> LogisticRegression:
    """
    True parameter-level weighted FedAvg for Logistic Regression:
    Averages coefficients and intercepts weighted by client sample sizes.
    """
    logger.info(f"Aggregating {len(updates)} Logistic Regression models...")
    
    total_samples = sum(u.sample_count for u in updates)
    if total_samples == 0:
        raise ValueError("Total sample count is zero.")

    coef_sum = None
    intercept_sum = None
    first_model = None
    
    for u in updates:
        with open(u.update_path, "rb") as f:
            model: LogisticRegression = pickle.load(f)
            
        if first_model is None:
            first_model = model
            
        weight = u.sample_count / total_samples
        
        if coef_sum is None:
            coef_sum = model.coef_ * weight
            intercept_sum = model.intercept_ * weight
        else:
            coef_sum += model.coef_ * weight
            intercept_sum += model.intercept_ * weight
            
    # Instantiate new model and load aggregated parameters
    global_model = LogisticRegression(random_state=42)
    # Set dimensions/attributes
    global_model.classes_ = first_model.classes_
    global_model.n_features_in_ = first_model.n_features_in_
    if hasattr(first_model, "feature_names_in_"):
        global_model.feature_names_in_ = first_model.feature_names_in_
        
    global_model.coef_ = coef_sum
    global_model.intercept_ = intercept_sum
    
    return global_model


def aggregate_xgboost_ensemble(
    updates: List[ModelUpdate]
) -> FederatedEnsembleClassifier:
    """
    Federated Ensemble Aggregation for XGBoost:
    Loads each local XGBClassifier and builds a voting ensemble.
    """
    logger.info(f"Aggregating {len(updates)} XGBoost models into Voting Ensemble...")
    
    models = []
    weights = []
    feature_names = None
    
    for u in updates:
        with open(u.update_path, "rb") as f:
            model: XGBClassifier = pickle.load(f)
        
        models.append(model)
        weights.append(float(u.sample_count))
        
        if feature_names is None and hasattr(model, "feature_names_in_"):
            feature_names = list(model.feature_names_in_)
            
    if not feature_names:
        feature_names = [f"f{i}" for i in range(models[0].n_features_in_)]
        
    ensemble = FederatedEnsembleClassifier(models, weights, feature_names)
    return ensemble


def aggregate_cnn(
    updates: List[ModelUpdate]
) -> dict:
    """
    FedAvg for PyTorch CNNs:
    Averages the state_dict tensors weighted by client sample sizes.
    """
    logger.info(f"Aggregating {len(updates)} CNN models via FedAvg...")
    
    total_samples = sum(u.sample_count for u in updates)
    if total_samples == 0:
        raise ValueError("Total sample count is zero.")

    averaged_state_dict = None
    
    for u in updates:
        with open(u.update_path, "rb") as f:
            local_state_dict = pickle.load(f)
            
        weight = u.sample_count / total_samples
        
        if averaged_state_dict is None:
            averaged_state_dict = {k: v * weight for k, v in local_state_dict.items()}
        else:
            for k, v in local_state_dict.items():
                averaged_state_dict[k] += v * weight
                
    return averaged_state_dict


def aggregate_metrics(
    updates: List[ModelUpdate]
) -> Dict[str, float]:
    """
    Compute sample-weighted average of local validation metrics:
    M_global = sum(n_k * M_k) / sum(n_k)
    """
    total_samples = sum(u.sample_count for u in updates)
    if total_samples == 0:
        return {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0, "loss": 0.0, "auc": 0.0}

    metrics_sum = {
        "accuracy": 0.0,
        "precision": 0.0,
        "recall": 0.0,
        "f1": 0.0,
        "loss": 0.0,
        "auc": 0.0
    }
    
    for u in updates:
        try:
            m = json.loads(u.local_metrics_json)
        except Exception:
            m = {}
            
        w = u.sample_count / total_samples
        
        metrics_sum["accuracy"] += m.get("accuracy", 0.0) * w
        metrics_sum["precision"] += m.get("precision", 0.0) * w
        metrics_sum["recall"] += m.get("recall", 0.0) * w
        metrics_sum["f1"] += m.get("f1", 0.0) * w
        metrics_sum["loss"] += m.get("loss", 0.0) * w
        metrics_sum["auc"] += m.get("auc", 0.0) * w
        
    return {k: round(v, 4) for k, v in metrics_sum.items()}
