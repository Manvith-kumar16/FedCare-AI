"""Federated Learning Service - Simulated FedAvg for XGBoost"""
import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb
from typing import Dict, List, Optional, Tuple
from app.services.ai_service import (
    FEATURE_COLUMNS, TARGET_COLUMN,
    preprocess_data, load_hospital_data,
    train_local_model, save_model, load_model,
)
from app.core import settings


class FederatedLearningEngine:
    """Simulated Federated Learning engine using FedAvg for XGBoost."""

    def __init__(self, server_id: int, num_rounds: int = 5, local_epochs: int = 10):
        self.server_id = server_id
        self.num_rounds = num_rounds
        self.local_epochs = local_epochs
        self.global_model: Optional[xgb.Booster] = None
        self.training_history: List[Dict] = []

    def _get_hospital_data(self, hospital_ids: List[int]) -> Dict[int, pd.DataFrame]:
        """Load data for all participating hospitals."""
        data = {}
        for hid in hospital_ids:
            df = load_hospital_data(hid, self.server_id)
            if df is not None and len(df) > 0:
                data[hid] = df
        return data

    def _aggregate_models(
        self, local_models: List[xgb.Booster], weights: List[float]
    ) -> xgb.Booster:
        """
        Aggregate local XGBoost models using FedAvg.
        For XGBoost, we average the leaf weights across all trees from all clients.
        """
        if len(local_models) == 1:
            return local_models[0]

        # Simple approach: use the model trained on the combined predictions
        # Extract raw model data and average tree weights
        configs = []
        for model in local_models:
            raw = model.save_raw("json")
            config = json.loads(raw)
            configs.append(config)

        # Use the first model's structure as base
        base_config = configs[0]

        # Average the leaf values across all models
        if "learner" in base_config and "gradient_booster" in base_config["learner"]:
            booster_data = base_config["learner"]["gradient_booster"]
            if "model" in booster_data and "trees" in booster_data["model"]:
                base_trees = booster_data["model"]["trees"]

                for tree_idx in range(len(base_trees)):
                    if "split_conditions" in base_trees[tree_idx]:
                        base_splits = base_trees[tree_idx]["split_conditions"]
                        avg_splits = np.array([float(s) for s in base_splits])

                        count = 1
                        for other_config in configs[1:]:
                            try:
                                other_trees = other_config["learner"]["gradient_booster"]["model"]["trees"]
                                if tree_idx < len(other_trees) and "split_conditions" in other_trees[tree_idx]:
                                    other_splits = np.array([float(s) for s in other_trees[tree_idx]["split_conditions"]])
                                    if len(other_splits) == len(avg_splits):
                                        avg_splits += other_splits
                                        count += 1
                            except (KeyError, IndexError):
                                continue

                        avg_splits /= count
                        base_trees[tree_idx]["split_conditions"] = [str(s) for s in avg_splits]

        # Reconstruct model from averaged config
        raw_bytes = json.dumps(base_config).encode()
        aggregated_model = xgb.Booster()
        aggregated_model.load_model(bytearray(raw_bytes))

        return aggregated_model

    def run_federated_training(
        self,
        hospital_ids: List[int],
        hospital_names: Dict[int, str],
    ) -> Dict:
        """Run complete federated training simulation."""
        # Load all hospital data
        hospital_data = self._get_hospital_data(hospital_ids)

        if not hospital_data:
            return {"error": "No hospital data found", "logs": []}

        all_logs = []
        global_metrics_per_round = []

        # XGBoost parameters
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

        for round_num in range(1, self.num_rounds + 1):
            round_logs = []
            local_models = []
            weights = []

            # Phase 1: Local training at each hospital
            for hid, df in hospital_data.items():
                model, metrics = train_local_model(
                    df,
                    params=params,
                    num_boost_round=self.local_epochs + (round_num * 5),
                    existing_model=self.global_model,
                )
                local_models.append(model)
                weights.append(len(df))

                log_entry = {
                    "server_id": self.server_id,
                    "round_number": round_num,
                    "hospital_id": hid,
                    "hospital_name": hospital_names.get(hid, f"Hospital {hid}"),
                    "local_accuracy": metrics["accuracy"],
                    "local_loss": metrics["loss"],
                    "local_f1": metrics["f1"],
                    "local_precision": metrics["precision"],
                    "local_recall": metrics["recall"],
                    "samples_trained": metrics["samples"],
                    "log_type": "local",
                }
                round_logs.append(log_entry)

            # Phase 2: Aggregate (FedAvg)
            total_samples = sum(weights)
            normalized_weights = [w / total_samples for w in weights]

            self.global_model = self._aggregate_models(local_models, normalized_weights)

            # Phase 3: Evaluate global model on all data
            all_accuracies = []
            all_losses = []
            for hid, df in hospital_data.items():
                X = df[FEATURE_COLUMNS].values
                y = df[TARGET_COLUMN].values
                dtest = xgb.DMatrix(X, feature_names=FEATURE_COLUMNS)
                preds = self.global_model.predict(dtest)
                pred_labels = (preds > 0.5).astype(int)
                from sklearn.metrics import accuracy_score, log_loss
                acc = accuracy_score(y, pred_labels)
                loss = log_loss(y, preds)
                all_accuracies.append(acc)
                all_losses.append(loss)

            global_acc = float(np.mean(all_accuracies))
            global_loss = float(np.mean(all_losses))

            # Update logs with global metrics
            for log in round_logs:
                log["global_accuracy"] = global_acc
                log["global_loss"] = global_loss

            # Add global round summary
            global_log = {
                "server_id": self.server_id,
                "round_number": round_num,
                "hospital_id": None,
                "hospital_name": "Global Aggregation",
                "local_accuracy": global_acc,
                "local_loss": global_loss,
                "local_f1": 0,
                "local_precision": 0,
                "local_recall": 0,
                "global_accuracy": global_acc,
                "global_loss": global_loss,
                "samples_trained": total_samples,
                "log_type": "global",
            }
            round_logs.append(global_log)
            all_logs.extend(round_logs)

            global_metrics_per_round.append({
                "round": round_num,
                "global_accuracy": global_acc,
                "global_loss": global_loss,
            })

            # Save model checkpoint
            save_model(self.global_model, self.server_id, round_num)

        # Save final model
        save_model(self.global_model, self.server_id, 0)

        return {
            "status": "completed",
            "total_rounds": self.num_rounds,
            "final_global_accuracy": global_metrics_per_round[-1]["global_accuracy"] if global_metrics_per_round else 0,
            "final_global_loss": global_metrics_per_round[-1]["global_loss"] if global_metrics_per_round else 0,
            "global_metrics": global_metrics_per_round,
            "logs": all_logs,
        }
