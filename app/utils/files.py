import os
from pathlib import Path
from typing import Tuple


STORAGE_ROOT = Path(os.getenv("DATA_STORAGE_PATH", "./storage")).resolve()


def ensure_storage_path(server_id: int, hospital_id: int, dataset_id: int) -> Path:
    path = STORAGE_ROOT / f"server_{server_id}" / f"hospital_{hospital_id}" / f"dataset_{dataset_id}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def secure_filename(filename: str) -> str:
    # keep simple: remove path separators
    return os.path.basename(filename)
