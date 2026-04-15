"""
Imaging Service - Medical imaging (DICOM/PNG) preprocessing for Federated Learning.
Simulated for demo purposes but follows standard medical imaging pipelines.
"""
import os
import numpy as np
from typing import Dict, List, Optional, Tuple
from app.core import settings

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

try:
    import pydicom
    HAS_DICOM = True
except ImportError:
    HAS_DICOM = False


class ImagingPreprocessor:
    """Handles medical image preprocessing for federated learning."""

    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        self.target_size = target_size

    def preprocess_image(self, file_path: str) -> Optional[np.ndarray]:
        """Load and preprocess a single medical image."""
        if not HAS_CV2:
            print("Imaging Service Error: OpenCV not installed")
            return None

        # Load image
        img = None
        if file_path.lower().endswith('.dcm'):
            if not HAS_DICOM:
                print("Imaging Service Error: pydicom not installed")
                return None
            ds = pydicom.dcmread(file_path)
            img = ds.pixel_array
        else:
            img = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)

        if img is None:
            return None

        # Normalization (Min-Max Scaling)
        img = (img - np.min(img)) / (np.max(img) - np.min(img) + 1e-5)
        
        # Resize
        img = cv2.resize(img, self.target_size)
        
        # Add channel dimension
        img = np.expand_dims(img, axis=-1)
        
        return img

    def batch_process(self, dir_path: str) -> List[np.ndarray]:
        """Process all images in a directory."""
        images = []
        if not os.path.exists(dir_path):
            return images

        for filename in os.listdir(dir_path):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.dcm')):
                img = self.preprocess_image(os.path.join(dir_path, filename))
                if img is not None:
                    images.append(img)
        
        return images


def get_imaging_stats(hospital_id: int, server_id: int) -> Dict:
    """Get metadata about imaging datasets for a hospital."""
    # Simulation: find image directories
    data_dir = os.path.join(settings.DATA_DIR, f"hospital_{hospital_id}", f"server_{server_id}", "imaging")
    
    if not os.path.exists(data_dir):
        return {"count": 0, "types": [], "status": "Empty"}

    files = os.listdir(data_dir)
    return {
        "count": len(files),
        "types": list(set([os.path.splitext(f)[1] for f in files])),
        "status": "Ready",
        "path": data_dir
    }
