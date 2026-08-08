"""
FedCare AI Hospital — AI Service
Local training and evaluation for XGBoost and Logistic Regression.
"""
import os
import pickle
import json
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, log_loss, classification_report, roc_auc_score
)
from sklearn.preprocessing import LabelEncoder
from typing import Dict, List, Optional, Tuple
from app.core import settings


# ─── Data Loading ─────────────────────────────────────────────────────────────

def load_dataframe(file_path: str, target_column: str) -> Optional[pd.DataFrame]:
    """Load CSV/TXT with auto delimiter detection and preprocessing."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset file not found: {file_path}")

    try:
        df = pd.read_csv(file_path, sep=None, engine="python")
        if df.shape[1] <= 1:
            df = pd.read_csv(file_path, sep=r"\s+", engine="python")
    except Exception as e:
        raise ValueError(f"Cannot parse file {file_path}: {e}")

    if df.empty:
        raise ValueError(f"Dataset is empty: {file_path}")

    # Drop unnamed index columns
    df = df.loc[:, ~df.columns.str.contains(r"^Unnamed")]
    df.columns = df.columns.str.strip()

    if target_column not in df.columns:
        raise ValueError(
            f"Target column '{target_column}' not found. "
            f"Available columns: {list(df.columns)}"
        )

    # Drop rows where target is null
    df = df.dropna(subset=[target_column])

    # Numeric imputation for features
    feature_cols = [c for c in df.columns if c != target_column]
    for col in feature_cols:
        if df[col].dtype == object:
            # Try numeric conversion
            converted = pd.to_numeric(df[col], errors="coerce")
            if converted.notna().sum() > 0:
                df[col] = converted
            else:
                # Encode as categorical
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
        df[col] = df[col].fillna(df[col].median())

    # Encode target if it's not already numeric
    if df[target_column].dtype == object:
        le = LabelEncoder()
        df[target_column] = le.fit_transform(df[target_column].astype(str))

    return df


def detect_schema(df: pd.DataFrame, hint_target: str = None) -> Tuple[List[str], str]:
    """Auto-detect feature columns and target column from a dataframe."""
    columns = list(df.columns)

    # Common target column names
    target_candidates = [
        hint_target,
        "Outcome", "outcome", "Target", "target", "Label", "label",
        "Class", "class", "diagnosis", "Diagnosis", "diabetes", "Diabetes",
        "y", "Y"
    ]

    target = None
    for candidate in target_candidates:
        if candidate and candidate in columns:
            target = candidate
            break

    if target is None:
        target = columns[-1]

    features = [c for c in columns if c != target]
    return features, target


# ─── Model Persistence ────────────────────────────────────────────────────────

def _local_model_path(server_id: int, hospital_id: int) -> str:
    d = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, f"local_model_{hospital_id}.pkl")


def _global_model_path(server_id: int) -> str:
    d = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, "global_model.pkl")


def save_local_model(model, server_id: int, hospital_id: int) -> str:
    path = _local_model_path(server_id, hospital_id)
    with open(path, "wb") as f:
        pickle.dump(model, f)
    return path


def load_local_model(server_id: int, hospital_id: int):
    path = _local_model_path(server_id, hospital_id)
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return pickle.load(f)


def save_global_model(model, server_id: int) -> str:
    path = _global_model_path(server_id)
    with open(path, "wb") as f:
        pickle.dump(model, f)
    return path


def load_global_model(server_id: int):
    path = _global_model_path(server_id)
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return pickle.load(f)


# ─── Training ─────────────────────────────────────────────────────────────────

def train_local_model(
    file_path: str,
    target_column: str,
    hospital_id: int,
    server_id: int,
    model_type: str = "xgboost",
    epochs: int = 10,
    log_callback=None,
) -> Tuple[object, Dict]:
    """
    Train a local model (XGBoost or Logistic Regression) on a single hospital dataset.
    Saves the model as a .pkl file.
    Returns (model, metrics_dict).
    """
    def log(msg: str):
        print(f"[local-train h{hospital_id}] {msg}")
        if log_callback:
            log_callback(msg)

    log(f"Loading dataset from {file_path}")
    df = load_dataframe(file_path, target_column)
    features, target = detect_schema(df, hint_target=target_column)

    log(f"Dataset loaded: {len(df)} rows, {len(features)} features")

    if len(df) < 2:
        raise ValueError(
            f"Too few samples ({len(df)}) in hospital {hospital_id} dataset. "
            "Need at least 2 rows for local training."
        )

    X = df[features].values
    y = df[target].values

    # Stratified split when possible
    unique, counts = np.unique(y, return_counts=True)
    can_stratify = len(unique) > 1 and counts.min() >= 2
    try:
        if can_stratify:
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
        else:
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
    except ValueError:
        X_train, y_train = X, y
        X_val, y_val = X, y

    log(f"Train: {len(X_train)} samples | Val: {len(X_val)} samples")

    if len(np.unique(y_train)) < 2:
        dummy_class = 1 if y_train[0] == 0 else 0
        y_train = np.append(y_train, dummy_class)
        X_train = np.vstack([X_train, X_train[-1:]])

    if len(X_val) < len(y_val):
        y_val = y_val[:len(X_val)]
    elif len(X_val) > len(y_val):
        y_val = np.pad(y_val, (0, len(X_val) - len(y_val)), mode='edge')

    # Model definition
    if model_type.lower() == "logistic_regression":
        log("Training scikit-learn Logistic Regression model...")
        model = LogisticRegression(max_iter=epochs * 10, random_state=42)
        model.fit(X_train, y_train)
    else:
        log("Training XGBoost model...")
        model = XGBClassifier(
            n_estimators=epochs * 10,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=3,
            random_state=42,
            use_label_encoder=False,
            eval_metric=["logloss", "error"],
            verbosity=0,
        )
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

    log("Training complete. Evaluating...")
    metrics = evaluate(model, X_val, y_val, features)
    log(f"Accuracy: {metrics['accuracy']:.4f} | F1: {metrics['f1']:.4f}")

    # Attach feature names to model
    try:
        model.feature_names_in_ = np.array(features)
    except AttributeError:
        pass

    # Save
    path = save_local_model(model, server_id, hospital_id)
    log(f"Model saved locally -> {path}")

    return model, metrics


# ─── Evaluation ───────────────────────────────────────────────────────────────

def evaluate(
    model,
    X_val: np.ndarray,
    y_val: np.ndarray,
    feature_names: List[str],
) -> Dict:
    """Compute and return a full suite of classification metrics."""
    y_pred = model.predict(X_val)
    y_proba = model.predict_proba(X_val)[:, 1]

    acc = float(accuracy_score(y_val, y_pred))
    prec = float(precision_score(y_val, y_pred, zero_division=0))
    rec = float(recall_score(y_val, y_pred, zero_division=0))
    f1 = float(f1_score(y_val, y_pred, zero_division=0))
    loss = float(log_loss(y_val, y_proba))
    report = classification_report(y_val, y_pred, zero_division=0)

    auc = 0.0
    try:
        if len(np.unique(y_val)) > 1:
            auc = float(roc_auc_score(y_val, y_proba))
    except Exception:
        pass

    # Get loss history if XGBoost
    history = {}
    if isinstance(model, XGBClassifier):
        try:
            evals = model.evals_result()
            h_loss = evals.get("validation_0", {}).get("logloss", [])
            h_error = evals.get("validation_0", {}).get("error", [])
            history = {
                "loss": h_loss,
                "accuracy": [(1.0 - e) for e in h_error] if h_error else []
            }
        except Exception:
            pass

    return {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "loss": loss,
        "auc": auc,
        "samples": len(X_val),
        "report": report,
        "history": history,
    }


# ─── Prediction ───────────────────────────────────────────────────────────────

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
