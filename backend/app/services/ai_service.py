"""
FedCare AI — AI Service
Real XGBoost training and prediction using sklearn-compatible XGBClassifier.
No mocks. No fake data. All results derived from actual model inference.
"""
import os
import pickle
import json
import io
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
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
        # Fall back to last column
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


def save_local_model(model: XGBClassifier, server_id: int, hospital_id: int) -> str:
    path = _local_model_path(server_id, hospital_id)
    with open(path, "wb") as f:
        pickle.dump(model, f)
    return path


def load_local_model(server_id: int, hospital_id: int) -> Optional[XGBClassifier]:
    path = _local_model_path(server_id, hospital_id)
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return pickle.load(f)


def save_global_model(model: XGBClassifier, server_id: int) -> str:
    path = _global_model_path(server_id)
    with open(path, "wb") as f:
        pickle.dump(model, f)
    # Also keep legacy json path so old code doesn't crash
    try:
        booster = model.get_booster()
        json_path = os.path.join(settings.MODELS_DIR, f"server_{server_id}", "global_model_latest.json")
        booster.save_model(json_path)
    except Exception:
        pass
    return path


def load_global_model(server_id: int) -> Optional[XGBClassifier]:
    path = _global_model_path(server_id)
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return pickle.load(f)


# Backwards-compat alias for old code that calls load_model / save_model
def load_model(server_id: int, round_num=None):
    return load_global_model(server_id)


def save_model(model, server_id: int, round_num: int = 0):
    if isinstance(model, XGBClassifier):
        return save_global_model(model, server_id)
    # Raw Booster fallback
    d = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, f"global_model_round_{round_num}.json")
    model.save_model(path)
    latest = os.path.join(d, "global_model_latest.json")
    model.save_model(latest)
    return path


# ─── Training ─────────────────────────────────────────────────────────────────

def train_local_model(
    file_path: str,
    target_column: str,
    hospital_id: int,
    server_id: int,
    log_callback=None,
) -> Tuple[XGBClassifier, Dict]:
    """
    Train a local XGBClassifier on a single hospital dataset.
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

    if len(df) < 20:
        raise ValueError(
            f"Too few samples ({len(df)}) in hospital {hospital_id} dataset. "
            "Need at least 20 rows for local training."
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

    model = XGBClassifier(
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

    log("Training XGBoost model...")
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )
    log("Training complete. Evaluating...")

    metrics = evaluate(model, X_val, y_val, features)
    log(f"Accuracy: {metrics['accuracy']:.4f} | F1: {metrics['f1']:.4f}")

    # Attach feature names to model for later use
    model.feature_names_in_ = np.array(features)

    # Save
    path = save_local_model(model, server_id, hospital_id)
    log(f"Model saved → {path}")

    return model, metrics


def train_combined_model(
    datasets: List[Tuple[str, str]],  # [(file_path, target_column), ...]
    server_id: int,
    num_boost_round: int = 200,
    log_callback=None,
) -> Tuple[XGBClassifier, Dict, List[str]]:
    """
    Train a single XGBClassifier on the combined data from all hospitals.
    Returns (model, metrics, feature_columns).
    """
    def log(msg):
        print(f"[combined-train] {msg}")
        if log_callback:
            log_callback(msg)

    dfs = []
    target_col = None
    for fp, tc in datasets:
        log(f"Loading: {fp}")
        df = load_dataframe(fp, tc)
        if target_col is None:
            _, target_col = detect_schema(df, hint_target=tc)
        dfs.append(df)

    combined = pd.concat(dfs, ignore_index=True)
    log(f"Combined dataset: {len(combined)} rows")

    features, target = detect_schema(combined, hint_target=target_col)
    log(f"Features ({len(features)}): {features}")
    log(f"Target: {target}")

    MIN_ROWS = 50
    if len(combined) < MIN_ROWS:
        raise ValueError(
            f"Insufficient data: {len(combined)} rows across all hospitals. "
            f"Need at least {MIN_ROWS} rows total. Upload larger datasets."
        )

    X = combined[features].values
    y = combined[target].values

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

    log(f"Train split: {len(X_train)} | Val split: {len(X_val)}")
    log(f"Class distribution: {dict(zip(unique.tolist(), counts.tolist()))}")

    model = XGBClassifier(
        n_estimators=num_boost_round,
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

    log(f"Training XGBoost ({num_boost_round} estimators)...")
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )
    log("Training complete.")

    metrics = evaluate(model, X_val, y_val, features)
    log(f"Accuracy={metrics['accuracy']:.4f} | F1={metrics['f1']:.4f} | AUC={metrics.get('auc', 0):.4f}")
    log("Classification Report:\n" + metrics["report"])

    model.feature_names_in_ = np.array(features)
    save_global_model(model, server_id)
    log(f"Global model saved → {_global_model_path(server_id)}")

    return model, metrics, features


# ─── Evaluation ───────────────────────────────────────────────────────────────

def evaluate(
    model: XGBClassifier,
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

    # Per-evals loss history from internal model
    history = []
    try:
        evals = model.evals_result()
        history = evals.get("validation_0", {}).get("logloss", [])
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
    model: XGBClassifier,
    features: Dict[str, float],
    feature_columns: List[str],
) -> Dict:
    """
    Run inference on a single patient input.
    Always uses predict_proba for real probabilities.
    """
    # Build input in correct feature order
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


def is_model_degenerate(model: XGBClassifier, feature_columns: List[str]) -> bool:
    """Check if the model returns identical probabilities for all inputs (degenerate)."""
    try:
        low = {col: 0.0 for col in feature_columns}
        high = {col: 1e6 for col in feature_columns}
        r1 = predict_single(model, low, feature_columns)
        r2 = predict_single(model, high, feature_columns)
        return abs(r1["probability_positive"] - r2["probability_positive"]) < 0.001
    except Exception:
        return True


# ─── Backwards-compat shim ───────────────────────────────────────────────────

def preprocess_data(df: pd.DataFrame, target_column: str) -> pd.DataFrame:
    """Kept for backwards compatibility with old training endpoint code."""
    df = df.copy()
    df = df.loc[:, ~df.columns.str.contains(r"^Unnamed")]
    feature_cols = [c for c in df.columns if c != target_column]
    for col in feature_cols:
        if df[col].dtype in [np.float64, np.int64, float, int]:
            df[col] = df[col].fillna(df[col].median())
    return df
