import os
from pathlib import Path
from typing import Dict
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import torch
from PIL import Image
import shap

from app.repositories.prediction import PredictionRepository
from app.utils.ml import load_torch_model, load_xgb_model
from app.utils.files import STORAGE_ROOT


class XAIService:
    def __init__(self, session):
        self.session = session
        self.repo = PredictionRepository(session)

    async def explain(self, prediction_id: int) -> Dict[str, str]:
        pred = await self.repo.get_by_id(prediction_id)
        if not pred:
            raise ValueError("Prediction not found")

        server_id = pred.server_id
        out_dir = Path(STORAGE_ROOT) / f"server_{server_id}" / "explanations" / f"prediction_{prediction_id}"
        out_dir.mkdir(parents=True, exist_ok=True)

        if pred.model_type == 'image':
            # load model
            model_path = pred.model_path
            from app.services.model_service import SimpleImageCNN
            model = SimpleImageCNN(n_classes=2)
            load_torch_model(model, model_path)

            # load input image
            if not pred.input_path:
                raise ValueError("No input path available for image prediction")
            img = Image.open(pred.input_path).convert('RGB').resize((224, 224))
            img_arr = np.array(img).astype(np.float32) / 255.0
            # Grad-CAM implementation (simple)
            heatmap = self._gradcam(model, img_arr)
            heatmap_img = self._save_heatmap(heatmap, out_dir / 'heatmap.png')
            overlay_path = self._save_overlay(img, heatmap, out_dir / 'overlay.png')
            return {"heatmap": str(heatmap_img), "overlay": str(overlay_path)}

        elif pred.model_type == 'tabular':
            model = load_xgb_model(pred.model_path)
            features = pred.metadata.get('features') if pred.metadata else None
            if features is None:
                raise ValueError("No features available for SHAP explanation")
            # create explainer
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(np.array([features]))
            fig = shap.plots._waterfall.waterfall_legacy(explainer.expected_value, shap_values[0], features, show=False)
            # shap native plotting may return a matplotlib figure; save to file
            out_path = out_dir / 'shap.png'
            plt.savefig(out_path)
            plt.close('all')
            return {"shap": str(out_path)}

        else:
            raise ValueError("Unsupported model_type for explanation")

    def _gradcam(self, model, img_arr: np.ndarray) -> np.ndarray:
        # Simple Grad-CAM for last conv layer
        model.eval()
        tensor = torch.tensor(np.transpose(img_arr, (2, 0, 1))).unsqueeze(0).float()
        gradients = {}
        activations = {}

        def save_grad(name):
            def hook(module, grad_in, grad_out):
                gradients[name] = grad_out[0].detach()
            return hook

        def save_act(name):
            def hook(module, input, output):
                activations[name] = output.detach()
            return hook

        # pick a conv layer
        for name, module in model.named_modules():
            if isinstance(module, torch.nn.Conv2d):
                target_module = module

        target_module.register_forward_hook(save_act('target'))
        target_module.register_backward_hook(save_grad('target'))

        out = model(tensor)
        score = out[0].max()
        model.zero_grad()
        score.backward()

        act = activations['target'][0]
        grad = gradients['target'][0]
        weights = grad.mean(dim=(1, 2), keepdim=True)
        cam = (weights * act).sum(dim=0).cpu().numpy()
        cam = np.maximum(cam, 0)
        cam = cam - cam.min()
        cam = cam / (cam.max() + 1e-8)
        cam = np.uint8(cam * 255)
        cam = np.expand_dims(cam, axis=2)
        cam = np.repeat(cam, 3, axis=2)
        cam = Image.fromarray(cam).resize((224, 224))
        return np.array(cam)

    def _save_heatmap(self, heatmap: np.ndarray, path: Path) -> Path:
        Image.fromarray(heatmap).save(path)
        return path

    def _save_overlay(self, img: Image.Image, heatmap: np.ndarray, path: Path) -> Path:
        heat = Image.fromarray(heatmap).convert('RGBA')
        base = img.convert('RGBA').resize(heat.size)
        overlay = Image.blend(base, heat, alpha=0.5)
        overlay.save(path)
        return path
