import os
import time
from pathlib import Path
from typing import Dict, Any

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from sklearn.model_selection import train_test_split
import xgboost as xgb

from app.utils.ml import save_torch_model, save_xgb_model, load_xgb_model, load_torch_model
from app.utils.files import STORAGE_ROOT
from app.repositories.dataset import DatasetRepository
from app.repositories.prediction import PredictionRepository


class SimpleImageCNN(nn.Module):
    def __init__(self, n_classes=2):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(3, 16, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(32 * 56 * 56, 128),
            nn.ReLU(),
            nn.Linear(128, n_classes),
        )

    def forward(self, x):
        x = self.conv(x)
        return self.classifier(x)


class SimpleSpectrogramCNN(nn.Module):
    def __init__(self, n_classes=2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(1, 8, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Flatten(),
            nn.Linear(8 * 64 * 64, 128),
            nn.ReLU(),
            nn.Linear(128, n_classes),
        )

    def forward(self, x):
        return self.net(x)


class NumpyDataset(Dataset):
    def __init__(self, X, y):
        self.X = X
        self.y = y

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


class ModelService:
    def __init__(self, session):
        self.session = session
        self.repo = DatasetRepository(session)

    async def _collect_datasets(self, server_id: int):
        # collect all dataset files under storage/server_{server_id}/hospital_*/dataset_*/
        base = Path(STORAGE_ROOT) / f"server_{server_id}"
        files = list(base.rglob("**/*")) if base.exists() else []
        # filter files only (not dirs)
        files = [f for f in files if f.is_file()]
        return files

    async def train(self, server_id: int, config: Dict[str, Any]):
        # config contains model_type, epochs, etc.
        files = await self._collect_datasets(server_id)
        model_type = config.get("model_type", "image")
        epochs = int(config.get("epochs", 3))

        if model_type == "image":
            # naive: load images from files with .jpg/.png and synthetic labels from filename
            from PIL import Image
            X = []
            y = []
            for f in files:
                if f.suffix.lower() in (".jpg", ".jpeg", ".png"):
                    img = Image.open(f).convert('RGB').resize((224, 224))
                    arr = np.array(img).astype(np.float32) / 255.0
                    arr = np.transpose(arr, (2, 0, 1))  # C,H,W
                    X.append(arr)
                    # label: infer 0/1 from filename convention: contain 'pos' => 1 else 0
                    y.append(1 if 'pos' in f.stem.lower() else 0)

            X = np.stack(X)
            y = np.array(y)
            X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2)
            ds_train = NumpyDataset(X_train, y_train)
            ds_val = NumpyDataset(X_val, y_val)
            dl = DataLoader(ds_train, batch_size=8, shuffle=True)

            model = SimpleImageCNN(n_classes=2)
            loss_fn = nn.CrossEntropyLoss()
            opt = optim.Adam(model.parameters(), lr=1e-3)

            for epoch in range(epochs):
                model.train()
                total_loss = 0.0
                for xb, yb in dl:
                    xb = torch.tensor(xb)
                    yb = torch.tensor(yb).long()
                    preds = model(xb)
                    loss = loss_fn(preds, yb)
                    opt.zero_grad()
                    loss.backward()
                    opt.step()
                    total_loss += loss.item()
                # simple epoch logging
                print(f"Epoch {epoch+1}/{epochs} loss={total_loss:.4f}")

            path = save_torch_model(model, server_id, f"image_model_{int(time.time())}")
            return {"model_path": path}

        elif model_type == "tabular":
            # collect csv files
            import pandas as pd
            rows = []
            for f in files:
                if f.suffix.lower() == '.csv':
                    df = pd.read_csv(f)
                    rows.append(df)
            if not rows:
                raise RuntimeError("No CSV datasets found")
            df = pd.concat(rows, ignore_index=True)
            # naive: last column is label
            X = df.iloc[:, :-1].values
            y = df.iloc[:, -1].values
            X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2)
            model = xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss')
            model.fit(X_train, y_train)
            path = save_xgb_model(model, server_id, f"xgb_model_{int(time.time())}")
            return {"model_path": path}

        elif model_type == "audio":
            # load spectrogram arrays saved in preprocessing metadata or compute on the fly
            import librosa
            X = []
            y = []
            for f in files:
                if f.suffix.lower() in ('.wav', '.mp3'):
                    y_audio, sr = librosa.load(f, sr=22050)
                    S = librosa.feature.melspectrogram(y=y_audio, sr=sr, n_mels=128)
                    S_db = librosa.power_to_db(S, ref=np.max)
                    # resize/pad to 128x128
                    arr = S_db
                    if arr.shape[1] < 128:
                        pad = np.zeros((128, 128))
                        pad[:, :arr.shape[1]] = arr
                        arr = pad
                    arr = arr[:128, :128]
                    X.append(arr)
                    y.append(1 if 'pos' in f.stem.lower() else 0)
            X = np.stack(X)
            X = X[:, None, :, :]
            y = np.array(y)
            X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2)
            ds_train = NumpyDataset(X_train, y_train)
            dl = DataLoader(ds_train, batch_size=4, shuffle=True)
            model = SimpleSpectrogramCNN(n_classes=2)
            loss_fn = nn.CrossEntropyLoss()
            opt = optim.Adam(model.parameters(), lr=1e-3)
            for epoch in range(epochs):
                total_loss = 0.0
                for xb, yb in dl:
                    xb = torch.tensor(xb).float()
                    yb = torch.tensor(yb).long()
                    preds = model(xb)
                    loss = loss_fn(preds, yb)
                    opt.zero_grad()
                    loss.backward()
                    opt.step()
                    total_loss += loss.item()
                print(f"Epoch {epoch+1}/{epochs} loss={total_loss:.4f}")
            path = save_torch_model(model, server_id, f"audio_model_{int(time.time())}")
            return {"model_path": path}

        else:
            raise ValueError("Unsupported model_type")

    async def predict(self, server_id: int, payload: Dict[str, Any]):
        # payload contains model_type and a single file path or features
        model_type = payload.get('model_type')
            if model_type == 'tabular':
            model_files = list((Path(STORAGE_ROOT) / f"server_{server_id}" / 'models').glob('xgb_model_*.joblib'))
            if not model_files:
                raise RuntimeError("No xgb model found")
            model = load_xgb_model(str(model_files[-1]))
            features = payload.get('features')
            pred = model.predict_proba([features])[0]
            label = model.predict([features])[0]
            conf = float(max(pred))
            # persist prediction
            repo = PredictionRepository(self.session)
            pred_rec = await repo.create(server_id=server_id, model_type='tabular', input_path=None, model_path=str(model_files[-1]), label=str(int(label)), confidence=str(conf), metadata={"features": features})
            return {"label": int(label), "confidence": conf, "prediction_id": pred_rec.id}

        elif model_type in ('image', 'audio'):
            model_files = list((Path(STORAGE_ROOT) / f"server_{server_id}" / 'models').glob(f"{model_type}_model_*.pt"))
            if not model_files:
                raise RuntimeError("No torch model found")
            latest = str(model_files[-1])
            if model_type == 'image':
                model = SimpleImageCNN(n_classes=2)
            else:
                model = SimpleSpectrogramCNN(n_classes=2)
            load_torch_model(model, latest)
            # payload should include 'input' as numpy array-like
            inp = np.array(payload.get('input'))
            if model_type == 'image':
                # expect C,H,W
                tensor = torch.tensor(inp).unsqueeze(0).float()
            else:
                tensor = torch.tensor(inp).unsqueeze(0).float()
            with torch.no_grad():
                out = model(tensor)
                probs = torch.softmax(out, dim=1).numpy()[0]
                label = int(probs.argmax())
                conf = float(probs.max())
            # persist prediction
            repo = PredictionRepository(self.session)
            # If input was provided as array we don't have path
            pred_rec = await repo.create(server_id=server_id, model_type=model_type, input_path=None, model_path=latest, label=str(int(label)), confidence=str(conf), metadata={})
            return {"label": label, "confidence": conf, "prediction_id": pred_rec.id}

        else:
            raise ValueError("Unsupported model_type for prediction")
