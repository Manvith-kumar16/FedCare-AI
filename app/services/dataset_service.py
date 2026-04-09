import io
from typing import Tuple, Optional
from PIL import Image
import numpy as np
import librosa
import soundfile as sf
import pandas as pd

from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.dataset import DatasetRepository
from app.repositories.disease_server import ServerMemberRepository
from app.utils.files import ensure_storage_path, secure_filename


class DatasetService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = DatasetRepository(session)
        self.members = ServerMemberRepository(session)

    async def upload_file(self, server_id: int, hospital_id: int, upload_file, content_type: str) -> dict:
        # Check membership
        members = await self.members.list_for_server(server_id)
        allowed = any(m.hospital_id == hospital_id and m.status == 'approved' for m in members)
        if not allowed:
            raise PermissionError("Hospital not approved to contribute to this server")

        filename = secure_filename(upload_file.filename)
        # Create dataset metadata first (temporary record)
        ds = await self.repo.create(server_id=server_id, hospital_id=hospital_id, filename=filename, content_type=content_type, metadata={})
        # decide storage dir
        storage_dir = ensure_storage_path(server_id, hospital_id, ds.id)
        file_path = storage_dir / filename

        # Read file bytes
        body = await upload_file.read()
        with open(file_path, 'wb') as f:
            f.write(body)

        # Run preprocessing depending on content_type or filename
        meta = {}
        if content_type.startswith("image/") or filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            meta['preprocess'] = self._preprocess_image(file_path)
        elif content_type in ('text/csv', 'application/csv') or filename.lower().endswith('.csv'):
            meta['preprocess'] = self._preprocess_tabular(file_path)
        elif content_type.startswith('audio/') or filename.lower().endswith(('.wav', '.mp3')):
            meta['preprocess'] = self._preprocess_audio(file_path)

        # Update dataset metadata
        ds.metadata = meta
        self.session.add(ds)
        await self.session.commit()
        await self.session.refresh(ds)

        return {"id": ds.id, "filename": ds.filename, "metadata": ds.metadata}

    def _preprocess_image(self, path) -> dict:
        # Resize to 224x224 and normalize to [0,1]
        img = Image.open(path).convert('RGB')
        img = img.resize((224, 224))
        arr = np.array(img).astype(np.float32) / 255.0
        # store shape as metadata
        return {"shape": arr.shape, "dtype": str(arr.dtype)}

    def _preprocess_tabular(self, path) -> dict:
        df = pd.read_csv(path)
        # simple missing handling: fill numeric with mean, categorical with mode
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].fillna(df[col].mean())
            else:
                df[col] = df[col].fillna(df[col].mode().iloc[0] if not df[col].mode().empty else "")
        # encode simple categorical -> record columns and dtypes
        return {"columns": list(df.columns), "dtypes": {c: str(dt) for c, dt in df.dtypes.items()}, "rows": len(df)}

    def _preprocess_audio(self, path) -> dict:
        # Load audio and compute mel spectrogram
        y, sr = librosa.load(path, sr=22050)
        S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
        S_db = librosa.power_to_db(S, ref=np.max)
        return {"sr": sr, "shape": S_db.shape}
