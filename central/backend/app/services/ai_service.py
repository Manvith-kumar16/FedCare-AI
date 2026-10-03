"""
FedCare AI Central — AI Service
Handles global model loading and inference for public users.
"""
import os
import pickle
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from app.core.config import settings

def _global_model_path(server_id: int) -> str:
    d = os.path.join(settings.MODELS_DIR, f"server_{server_id}")
    return os.path.join(d, "global_model.pkl")

def load_global_model(server_id: int):
    path = _global_model_path(server_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception:
        import torch
        return torch.load(path, map_location="cpu", weights_only=True)

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
import torch
import torch.nn as nn

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

def predict_image(model_state_dict, image_bytes: bytes) -> dict:
    """Run inference on a single image byte stream."""
    import io
    from PIL import Image
    from torchvision import transforms
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SimpleCNN(num_classes=2).to(device)
    model.load_state_dict(model_state_dict)
    model.eval()

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    input_tensor = transform(image).unsqueeze(0).to(device)
    
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
        
    prob_pos = float(probabilities[1].item())
    prob_neg = float(probabilities[0].item())
    prediction = int(prob_pos >= 0.5)
    
    return {
        "prediction": prediction,
        "prediction_label": "Pneumonia Detected" if prediction == 1 else "Normal (Healthy)",
        "confidence": max(prob_pos, prob_neg),
        "probability_positive": prob_pos,
        "probability_negative": prob_neg,
    }

def explain_image(model_state_dict, image_bytes: bytes) -> str:
    """Generate a Grad-CAM style heatmap and return base64 encoded image."""
    import io
    from PIL import Image
    from torchvision import transforms
    import cv2
    import base64
    
    device = torch.device("cpu") # For grad operations, stick to CPU to avoid complexity
    model = SimpleCNN(num_classes=2).to(device)
    model.load_state_dict(model_state_dict)
    model.eval()
    
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    original_np = np.array(image.resize((224, 224)))
    input_tensor = transform(image).unsqueeze(0).to(device)
    
    input_tensor.requires_grad = True
    outputs = model(input_tensor)
    
    target_class = int(torch.argmax(outputs).item())
    outputs[0, target_class].backward()
    
    saliency, _ = torch.max(input_tensor.grad.data.abs(), dim=1)
    saliency = saliency.squeeze().numpy()
    
    # Normalize
    saliency = (saliency - saliency.min()) / (saliency.max() - saliency.min() + 1e-8)
    saliency = np.uint8(255 * saliency)
    
    heatmap = cv2.applyColorMap(saliency, cv2.COLORMAP_JET)
    superimposed_img = cv2.addWeighted(original_np, 0.6, heatmap, 0.4, 0)
    
    _, buffer = cv2.imencode('.jpg', superimposed_img)
    encoded = base64.b64encode(buffer).decode('utf-8')
    
    return encoded
