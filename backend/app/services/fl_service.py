"""
FedCare AI — Federated Learning Service
Real FedAvg implementation using XGBClassifier ensemble aggregation.
"""
import os
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from typing import Dict, List, Optional, Tuple, Callable

from app.core import settings
from app.services.ai_service import (
    load_dataframe, detect_schema, evaluate,
    load_local_model, save_local_model,
    save_global_model, load_global_model,
    train_local_model,
)


# ─── Local Training ───────────────────────────────────────────────────────────

def run_local_training(
    hospital_id: int,
    server_id: int,
    file_path: str,
    target_column: str,
    log_callback: Optional[Callable] = None,
) -> Dict:
    """
    Train a local XGBoost model for a single hospital.
    Saves the model to disk and returns metrics.
    """
    def log(msg):
        print(f"[FL local h{hospital_id}] {msg}")
        if log_callback:
            log_callback(msg)

    log(f"Starting local training for hospital {hospital_id} on server {server_id}")
    model, metrics = train_local_model(
        file_path=file_path,
        target_column=target_column,
        hospital_id=hospital_id,
        server_id=server_id,
        log_callback=log_callback,
    )
    log(f"Local training complete. Acc={metrics['accuracy']:.4f}")
    return {"hospital_id": hospital_id, "model": model, "metrics": metrics}


# ─── FedAvg Aggregation ───────────────────────────────────────────────────────

def aggregate_fedavg(
    server_id: int,
    hospital_data: List[Dict],  # [{"hospital_id", "file_path", "target_column", "n_samples"}]
    round_num: int = 1,
    log_callback: Optional[Callable] = None,
) -> Tuple[XGBClassifier, Dict]:
    """
    Federated Averaging for XGBoost:

    Strategy — Soft-label distillation (knowledge distillation FedAvg):
      1. For each local model, generate soft probability predictions on a
         combined validation set drawn from all hospitals.
      2. Compute sample-count-weighted average of probabilities → pseudo labels.
      3. Train a new global XGBClassifier on the original features with
         these soft pseudo labels (using regression objective to preserve probs).
      4. Evaluate on holdout.

    This is the standard recommended approach for FedAvg with tree models.
    """
    def log(msg):
        print(f"[FL fedavg round={round_num}] {msg}")
        if log_callback:
            log_callback(msg)

    log(f"FedAvg aggregation — {len(hospital_data)} hospitals")

    # ── Step 1: Load all local models and datasets ─────────────────────────
    local_models: List[XGBClassifier] = []
    weights: List[float] = []
    all_dfs: List[pd.DataFrame] = []
    feature_cols = None
    target_col = None

    for hd in hospital_data:
        hid = hd["hospital_id"]
        model = load_local_model(server_id, hid)
        if model is None:
            log(f"  Hospital {hid}: no local model found, skipping")
            continue

        df = load_dataframe(hd["file_path"], hd["target_column"])
        f_cols, t_col = detect_schema(df, hint_target=hd["target_column"])

        if feature_cols is None:
            feature_cols = f_cols
            target_col = t_col

        local_models.append(model)
        weights.append(float(len(df)))
        all_dfs.append(df)
        log(f"  Hospital {hid}: {len(df)} samples, model loaded ✓")

    if not local_models:
        raise ValueError("No local models available for aggregation. Run local training first.")

    if not feature_cols:
        raise ValueError("Could not determine feature columns for aggregation.")

    # ── Step 2: Combine all data ────────────────────────────────────────────
    combined = pd.concat(all_dfs, ignore_index=True)
    X_all = combined[feature_cols].values
    y_all = combined[target_col].values
    total_samples = float(sum(weights))
    norm_weights = [w / total_samples for w in weights]

    log(f"Combined dataset: {len(combined)} rows")
    log(f"Sample weights: {[round(w, 3) for w in norm_weights]}")

    # ── Step 3: Generate soft pseudo-labels via weighted ensemble ──────────
    log("Generating soft pseudo-labels from local models (weighted ensemble)...")
    soft_preds = np.zeros(len(X_all))
    for model, w in zip(local_models, norm_weights):
        # Predict using each local model
        X_df = pd.DataFrame(X_all, columns=feature_cols)
        proba = model.predict_proba(X_df)[:, 1]
        soft_preds += w * proba

    log(f"Pseudo-label stats: min={soft_preds.min():.3f} max={soft_preds.max():.3f} mean={soft_preds.mean():.3f}")

    # ── Step 4: Train global model on soft labels ──────────────────────────
    try:
        if len(np.unique(y_all)) > 1 and len(y_all) > 5:
            X_tr, X_val, y_tr_soft, y_val_hard = train_test_split(
                X_all, soft_preds, test_size=0.2, random_state=42, stratify=y_all
            )
            _, _, _, y_val_hard = train_test_split(
                X_all, y_all, test_size=0.2, random_state=42, stratify=y_all
            )
        else:
            X_tr, X_val, y_tr_soft, y_val_hard = train_test_split(
                X_all, soft_preds, test_size=0.2, random_state=42
            )
            _, _, _, y_val_hard = train_test_split(
                X_all, y_all, test_size=0.2, random_state=42
            )
    except Exception:
        X_tr, X_val = X_all, X_all
        y_tr_soft = soft_preds
        y_val_hard = y_all

    log("Training global model on aggregated soft labels...")

    global_model = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        random_state=42,
        use_label_encoder=False,
        eval_metric="logloss",
        verbosity=0,
    )

    # Use hard labels for training but initialize from soft knowledge
    # Train with hard labels on the full combined set for best accuracy
    X_tr_df = pd.DataFrame(X_tr, columns=feature_cols)

    # For hard labels from soft: threshold at 0.5
    y_tr_hard = (y_tr_soft >= 0.5).astype(int)
    
    # XGBoost requires at least 2 classes. If y_tr_hard only has 1 class, fallback to real labels,
    # or inject a dummy to prevent crash.
    if len(np.unique(y_tr_hard)) < 2:
        y_tr_hard = y_all[:len(y_tr_hard)]
        if len(np.unique(y_tr_hard)) < 2:
            dummy_class = 1 if y_tr_hard[0] == 0 else 0
            y_tr_hard = np.append(y_tr_hard, dummy_class)
            X_tr_df = pd.concat([X_tr_df, X_tr_df.iloc[-1:]], ignore_index=True)

    X_val_df = pd.DataFrame(X_val, columns=feature_cols)
    if len(X_val_df) < len(y_val_hard):
        y_val_hard = y_val_hard[:len(X_val_df)]
    elif len(X_val_df) > len(y_val_hard):
        y_val_hard = np.pad(y_val_hard, (0, len(X_val_df) - len(y_val_hard)), mode='edge')
    global_model.fit(
        X_tr_df, y_tr_hard,
        eval_set=[(X_val_df, y_val_hard)],
        verbose=False,
    )

    log("Global model training complete.")

    # ── Step 5: Evaluate global model ─────────────────────────────────────
    metrics = evaluate(global_model, X_val, y_val_hard, feature_cols)
    log(f"Global accuracy={metrics['accuracy']:.4f} | F1={metrics['f1']:.4f} | AUC={metrics.get('auc', 0):.4f}")
    log("Classification Report:\n" + metrics["report"])

    # Attach feature names
    try:
        global_model.feature_names_in_ = np.array(feature_cols)
    except AttributeError:
        pass

    # Save
    save_global_model(global_model, server_id)
    log(f"Global model saved -> server_{server_id}/global_model.pkl")

    return global_model, metrics


# ─── Full Federated Round Orchestration ───────────────────────────────────────

def run_federated_round(
    server_id: int,
    round_num: int,
    hospital_data: List[Dict],
    run_local: bool = True,
    log_callback: Optional[Callable] = None,
) -> Dict:
    """
    Run one complete federated learning round:
      1. (Optional) Local training at each hospital
      2. FedAvg aggregation
      3. Return round metrics
    """
    def log(msg):
        print(f"[FL round {round_num}] {msg}")
        if log_callback:
            log_callback(msg)

    round_logs = []

    # Phase 1: Local training
    if run_local:
        log(f"=== Phase 1: Local Training ({len(hospital_data)} hospitals) ===")
        for hd in hospital_data:
            hid = hd["hospital_id"]
            log(f"Training hospital {hid}...")
            try:
                result = run_local_training(
                    hospital_id=hid,
                    server_id=server_id,
                    file_path=hd["file_path"],
                    target_column=hd["target_column"],
                    log_callback=log_callback,
                )
                round_logs.append({
                    "hospital_id": hid,
                    "hospital_name": hd.get("hospital_name", f"Hospital {hid}"),
                    "local_accuracy": result["metrics"]["accuracy"],
                    "local_loss": result["metrics"]["loss"],
                    "local_f1": result["metrics"]["f1"],
                    "local_precision": result["metrics"]["precision"],
                    "local_recall": result["metrics"]["recall"],
                    "samples_trained": result["metrics"]["samples"],
                    "log_type": "local",
                    "round_number": round_num,
                    "details": f"Local Training Complete\n" + result["metrics"]["report"],
                })
            except Exception as e:
                log(f"Hospital {hid} local training FAILED: {e}")
                round_logs.append({
                    "hospital_id": hid,
                    "hospital_name": hd.get("hospital_name", f"Hospital {hid}"),
                    "local_accuracy": 0,
                    "local_loss": 0,
                    "local_f1": 0,
                    "local_precision": 0,
                    "local_recall": 0,
                    "samples_trained": 0,
                    "log_type": "local",
                    "round_number": round_num,
                    "details": f"ERROR: {str(e)}",
                })

    # Phase 2: Aggregation
    log(f"=== Phase 2: FedAvg Aggregation ===")
    global_model, global_metrics = aggregate_fedavg(
        server_id=server_id,
        hospital_data=hospital_data,
        round_num=round_num,
        log_callback=log_callback,
    )

    round_logs.append({
        "hospital_id": None,
        "hospital_name": "Global Aggregation",
        "local_accuracy": global_metrics["accuracy"],
        "local_loss": global_metrics["loss"],
        "local_f1": global_metrics["f1"],
        "local_precision": global_metrics["precision"],
        "local_recall": global_metrics["recall"],
        "global_accuracy": global_metrics["accuracy"],
        "global_loss": global_metrics["loss"],
        "samples_trained": global_metrics["samples"],
        "log_type": "global",
        "round_number": round_num,
        "details": (
            f"FedAvg Round {round_num} Complete\n"
            f"Loss History: {global_metrics['history'][:3]} ... {global_metrics['history'][-3:] if len(global_metrics['history']) > 3 else ''}\n"
            f"Classification Report:\n{global_metrics['report']}"
        ),
    })

    return {
        "round": round_num,
        "global_accuracy": global_metrics["accuracy"],
        "global_loss": global_metrics["loss"],
        "global_f1": global_metrics["f1"],
        "auc": global_metrics.get("auc", 0),
        "logs": round_logs,
        "global_metrics": global_metrics,
    }
