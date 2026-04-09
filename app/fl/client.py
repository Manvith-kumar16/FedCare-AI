"""Flower client implementation that hospitals can run locally.

This client expects data stored under the project's storage layout as created
by the backend (storage/server_<server_id>/hospital_<hospital_id>/dataset_<dataset_id>/).

Usage example (run on hospital node):
python -m app.fl.client --server-address 127.0.0.1:8080 --server-id 1 --hospital-id 2

"""
import argparse
import os
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from typing import Tuple, List
import flwr as fl

from app.services.model_service import SimpleImageCNN, SimpleSpectrogramCNN, NumpyDataset
from app.utils.files import STORAGE_ROOT


class FlowerHospitalClient(fl.client.NumPyClient):
    def __init__(self, server_id: int, hospital_id: int, model_type: str = "image", local_epochs: int = 1):
        self.server_id = server_id
        self.hospital_id = hospital_id
        self.model_type = model_type
        self.local_epochs = local_epochs
        # load local data
        self.X, self.y = self._load_local_data()
        if model_type == "image":
            self.model = SimpleImageCNN(n_classes=2)
        elif model_type == "audio":
            self.model = SimpleSpectrogramCNN(n_classes=2)
        else:
            self.model = None

    def _load_local_data(self) -> Tuple[np.ndarray, np.ndarray]:
        base = Path(STORAGE_ROOT) / f"server_{self.server_id}" / f"hospital_{self.hospital_id}"
        files = list(base.rglob("**/*")) if base.exists() else []
        X = []
        y = []
        for f in files:
            if f.suffix.lower() in (".jpg", ".jpeg", ".png") and self.model_type == "image":
                from PIL import Image
                img = Image.open(f).convert('RGB').resize((224, 224))
                arr = np.array(img).astype(np.float32) / 255.0
                arr = np.transpose(arr, (2, 0, 1))
                X.append(arr)
                y.append(1 if 'pos' in f.stem.lower() else 0)
            if f.suffix.lower() in ('.wav', '.mp3') and self.model_type == 'audio':
                import librosa
                y_audio, sr = librosa.load(f, sr=22050)
                S = librosa.feature.melspectrogram(y=y_audio, sr=sr, n_mels=128)
                S_db = librosa.power_to_db(S, ref=np.max)
                arr = S_db
                if arr.shape[1] < 128:
                    pad = np.zeros((128, 128))
                    pad[:, :arr.shape[1]] = arr
                    arr = pad
                arr = arr[:128, :128]
                X.append(arr)
                y.append(1 if 'pos' in f.stem.lower() else 0)
        if not X:
            return np.zeros((0,)), np.zeros((0,))
        X = np.stack(X)
        y = np.array(y)
        return X, y

    def get_parameters(self):
        # Return model parameters as NumPy arrays
        if self.model is None:
            return []
        return [val.cpu().numpy() for _, val in self.model.state_dict().items()]

    def set_parameters(self, parameters):
        # Load parameters into model
        if self.model is None:
            return
        state_dict = self.model.state_dict()
        new_state = {}
        for (k, v), arr in zip(state_dict.items(), parameters):
            new_state[k] = torch.tensor(arr)
        self.model.load_state_dict(new_state)

    def fit(self, parameters, config):
        # set weights
        self.set_parameters(parameters)
        # local training
        if len(self.X) == 0:
            return parameters, 0, {}

        import torch.optim as optim
        import torch.nn as nn

        X = self.X
        y = self.y
        # convert so that for image: (N,C,H,W), audio: (N,H,W) -> add channel
        if self.model_type == 'image':
            tensor_x = torch.tensor(X).float()
            tensor_y = torch.tensor(y).long()
        else:
            tensor_x = torch.tensor(X)[:, None, :, :].float()
            tensor_y = torch.tensor(y).long()

        dataset = NumpyDataset(tensor_x.numpy(), tensor_y.numpy())
        from torch.utils.data import DataLoader
        dl = DataLoader(dataset, batch_size=8, shuffle=True)
        opt = optim.Adam(self.model.parameters(), lr=1e-4)
        loss_fn = nn.CrossEntropyLoss()
        self.model.train()
        for epoch in range(self.local_epochs):
            for xb, yb in dl:
                xb = torch.tensor(xb).float()
                yb = torch.tensor(yb).long()
                preds = self.model(xb)
                loss = loss_fn(preds, yb)
                opt.zero_grad()
                loss.backward()
                opt.step()

        # return updated weights
        return self.get_parameters(), len(self.X), {}

    def evaluate(self, parameters, config):
        self.set_parameters(parameters)
        if len(self.X) == 0:
            return 0.0, 0, {}
        import torch.nn.functional as F
        self.model.eval()
        with torch.no_grad():
            if self.model_type == 'image':
                tensor_x = torch.tensor(self.X).float()
            else:
                tensor_x = torch.tensor(self.X)[:, None, :, :].float()
            out = self.model(tensor_x)
            probs = torch.softmax(out, dim=1).numpy()
            preds = probs.argmax(axis=1)
            acc = (preds == self.y).mean()
        return float(1.0 - acc), len(self.X), {"accuracy": float(acc)}


def run_client(server_address: str, server_id: int, hospital_id: int, model_type: str, local_epochs: int):
    client = FlowerHospitalClient(server_id=server_id, hospital_id=hospital_id, model_type=model_type, local_epochs=local_epochs)
    fl.client.start_numpy_client(server_address, client)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--server-address", required=True)
    parser.add_argument("--server-id", type=int, required=True)
    parser.add_argument("--hospital-id", type=int, required=True)
    parser.add_argument("--model-type", choices=["image", "audio"], default="image")
    parser.add_argument("--local-epochs", type=int, default=1)
    args = parser.parse_args()
    run_client(args.server_address, args.server_id, args.hospital_id, args.model_type, args.local_epochs)


if __name__ == '__main__':
    main()
