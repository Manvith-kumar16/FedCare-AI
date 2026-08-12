"""
FedCare AI Hospital — AI Service
Local training and evaluation for XGBoost and Logistic Regression.
"""
import os
import pickle
import json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms
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


# ─── PyTorch CNN for Image Datasets ───────────────────────────────────────────

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

def train_local_cnn(
    file_path: str,
    hospital_id: int,
    server_id: int,
    epochs: int = 5,
    log_callback=None
) -> Tuple[Dict, Dict]:
    """Train PyTorch CNN locally on image datasets."""
    def log(msg):
        if log_callback:
            log_callback(msg)
        else:
            print(msg)

    # Assuming file_path is the .zip file path. We extract to file_path without .zip
    data_dir = file_path.replace('.zip', '')
    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"Dataset directory not found: {data_dir}")

    log(f"Loading Image Dataset from {data_dir}...")
    
    # Standard ResNet/CNN preprocessing
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    dataset = datasets.ImageFolder(root=data_dir, transform=transform)
    num_classes = len(dataset.classes)
    log(f"Found {len(dataset)} images belonging to {num_classes} classes: {dataset.classes}")

    if len(dataset) == 0:
        raise ValueError("No images found in the dataset directory.")

    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SimpleCNN(num_classes=num_classes).to(device)
    
    # Load global model weights if they exist
    local_global_dir = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
    global_model_path = os.path.join(local_global_dir, "global_model.pkl")
    if os.path.exists(global_model_path):
        log("Loading global model weights...")
        try:
            # First try torch.load since central uses torch.save (or pickle)
            # If it's a dummy XGBoost seed model, torch.load will fail, which we catch.
            state_dict = torch.load(global_model_path, weights_only=False, map_location=device)
            # Make sure it's actually a PyTorch state dict, not an XGBoost model dict
            if isinstance(state_dict, dict) and 'features.0.weight' in state_dict:
                model.load_state_dict(state_dict)
                log("Successfully loaded global weights.")
            else:
                log("Global model is not a valid CNN state dict (likely initial seed). Starting from scratch.")
        except Exception as e:
            log(f"Could not load global model (likely initial seed): {e}. Starting from scratch.")

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    log(f"Starting CNN training for {epochs} epochs on {device}...")

    history_loss = []
    history_acc = []

    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()

        train_loss = running_loss / len(train_loader)
        train_acc = correct / total
        history_loss.append(train_loss)
        history_acc.append(train_acc)
        log(f"Epoch {epoch+1}/{epochs} - Loss: {train_loss:.4f} - Acc: {train_acc:.4f}")

    # Validation
    model.eval()
    val_loss = 0.0
    val_correct = 0
    val_total = 0
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for inputs, labels in val_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            val_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            val_total += labels.size(0)
            val_correct += (predicted == labels).sum().item()
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())

    val_loss = val_loss / len(val_loader) if len(val_loader) > 0 else 0
    val_acc = val_correct / val_total if val_total > 0 else 0

    log(f"Validation Loss: {val_loss:.4f} - Validation Acc: {val_acc:.4f}")

    # Metrics format to match XGBoost return
    metrics = {
        "accuracy": val_acc,
        "precision": float(precision_score(all_labels, all_preds, average='macro', zero_division=0)),
        "recall": float(recall_score(all_labels, all_preds, average='macro', zero_division=0)),
        "f1": float(f1_score(all_labels, all_preds, average='macro', zero_division=0)),
        "loss": val_loss,
        "auc": 0.0, # Not calculating AUC for multi-class simple demo
        "samples": len(val_dataset),
        "history": {
            "loss": history_loss,
            "accuracy": history_acc
        }
    }

    # Extract state dict for Federated Averaging
    state_dict = model.state_dict()
    # Move to CPU before saving to avoid device mismatch issues across hospitals
    state_dict = {k: v.cpu() for k, v in state_dict.items()}
    
    # Save PyTorch state dict locally
    path_dir = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
    os.makedirs(path_dir, exist_ok=True)
    file_path = os.path.join(path_dir, f"local_model_{hospital_id}.pkl")
    torch.save(state_dict, file_path)
    log(f"Model saved locally -> {file_path}")
    
    return state_dict, metrics
