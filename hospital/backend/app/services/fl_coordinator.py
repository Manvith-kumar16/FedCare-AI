"""
FedCare AI Hospital — Federated Aggregation definition stub for Pickle deserialization.
Allows the local node to deserialize and use the central global ensembled models.
"""
import numpy as np
from typing import List

class FederatedEnsembleClassifier:
    """
    Stub definition matching central layout for local pickle deserialization.
    """
    def __init__(self, models: List[object], weights: List[float], feature_names: List[str]):
        self.models = models
        self.weights = np.array(weights) / sum(weights) if weights else np.array([])
        self.feature_names_in_ = np.array(feature_names)
        self.classes_ = np.array([0, 1])

    def predict_proba(self, X) -> np.ndarray:
        """Weighted average of prediction probabilities from each local model."""
        if not self.models:
            raise ValueError("No models in the ensemble.")
        
        probas = []
        for model in self.models:
            p = model.predict_proba(X)
            probas.append(p)
            
        weighted_probas = np.zeros_like(probas[0])
        for p, w in zip(probas, self.weights):
            weighted_probas += p * w
            
        return weighted_probas

    def predict(self, X) -> np.ndarray:
        """Predict class labels by thresholding the averaged probability."""
        probas = self.predict_proba(X)
        return (probas[:, 1] >= 0.5).astype(int)
