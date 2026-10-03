"""
FedCare AI Central — Federated Learning Aggregator/Coordinator
"""
import json
import logging
import torch
import torch.nn as nn
from typing import List, Dict
from app.core import settings
from app.models.model_update import ModelUpdate

logger = logging.getLogger("fedcare-central")


class SimpleCNN(nn.Module):
    def __init__(self, num_classes=2):
        super(SimpleCNN, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 16, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2)
        )
        self.classifier = nn.Sequential(
            nn.Linear(32 * 56 * 56, 128),  # Assuming 224x224 input
            nn.ReLU(),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x


# ─── Aggregation Routines ─────────────────────────────────────────────────────

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
        local_state_dict = torch.load(u.update_path, weights_only=True)
            
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
