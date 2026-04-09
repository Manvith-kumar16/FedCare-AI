import os
from pathlib import Path
import joblib
import torch

from app.utils.files import STORAGE_ROOT


def get_model_dir(server_id: int) -> Path:
    path = Path(STORAGE_ROOT) / f"server_{server_id}" / "models"
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_torch_model(model: torch.nn.Module, server_id: int, name: str):
    path = get_model_dir(server_id) / f"{name}.pt"
    torch.save(model.state_dict(), path)
    return str(path)


def load_torch_model(model: torch.nn.Module, path: str):
    model.load_state_dict(torch.load(path, map_location=torch.device('cpu')))
    model.eval()
    return model


def save_xgb_model(model, server_id: int, name: str):
    path = get_model_dir(server_id) / f"{name}.joblib"
    joblib.dump(model, path)
    return str(path)


def load_xgb_model(path: str):
    return joblib.load(path)
