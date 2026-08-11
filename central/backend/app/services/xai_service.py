"""
FedCare AI Central — XAI Service
Global SHAP explanations for public user predictions.
"""
import io
import base64
import numpy as np
import pandas as pd
import shap
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from typing import Dict, List, Optional
from app.services.ai_service import load_global_model
from app.services.fl_coordinator import FederatedEnsembleClassifier
from sklearn.linear_model import LogisticRegression

def _generate_shap_waterfall(
    shap_values: np.ndarray,
    feature_names: List[str],
    input_features: Dict[str, float],
) -> Optional[str]:
    """Generate SHAP bar chart as base64 PNG."""
    try:
        fig, ax = plt.subplots(figsize=(10, max(5, len(feature_names) * 0.5 + 2)))

        sorted_idx = np.argsort(np.abs(shap_values))
        sorted_names = [feature_names[i] for i in sorted_idx]
        sorted_vals = [float(shap_values[i]) for i in sorted_idx]
        colors = ["#e74c3c" if v > 0 else "#2ecc71" for v in sorted_vals]

        bars = ax.barh(sorted_names, sorted_vals, color=colors, edgecolor="none", height=0.6)

        for bar, val in zip(bars, sorted_vals):
            x = bar.get_width()
            ax.text(
                x + (0.002 if x >= 0 else -0.002),
                bar.get_y() + bar.get_height() / 2,
                f"{val:+.4f}",
                va="center",
                ha="left" if x >= 0 else "right",
                fontsize=9,
                color="#333",
            )

        ax.axvline(x=0, color="#888", linewidth=0.8, linestyle="--")
        ax.set_xlabel("SHAP Value (Impact on Prediction Probability)", fontsize=11)
        ax.set_title("Feature Contributions to This Prediction", fontsize=13, fontweight="bold")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)

        plt.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")
    except Exception as e:
        print(f"[central-xai] SHAP plot error: {e}")
        return None

def generate_shap_explanation(
    server_id: int,
    input_features: Dict[str, float],
    feature_columns: List[str],
) -> Dict:
    """
    Generate local SHAP values and visualizations on the central node for public users.
    """
    model = load_global_model(server_id)
        
    if model is None:
        return {"error": "No global model found."}

    input_vec = np.array([[float(input_features.get(col, 0.0)) for col in feature_columns]])
    input_df = pd.DataFrame(input_vec, columns=feature_columns)

    try:
        if isinstance(model, FederatedEnsembleClassifier):
            all_vals = []
            base_vals = []
            
            for sub_model, w in zip(model.models, model.weights):
                explainer = shap.TreeExplainer(sub_model)
                shap_vals = explainer.shap_values(input_df)
                
                if isinstance(shap_vals, list):
                    vals_sub = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
                elif len(shap_vals.shape) == 3:
                    vals_sub = shap_vals[0, :, 1]
                else:
                    vals_sub = shap_vals[0]
                    
                all_vals.append(vals_sub * w)
                
                base_v = explainer.expected_value
                if isinstance(base_v, (list, np.ndarray)):
                    base_v = float(base_v[1]) if len(base_v) > 1 else float(base_v[0])
                base_vals.append(float(base_v) * w)
                
            vals = sum(all_vals)
            base_val = sum(base_vals)
            
        elif isinstance(model, LogisticRegression):
            explainer = shap.LinearExplainer(model, mask=shap.maskers.Independent(input_df))
            shap_vals = explainer.shap_values(input_df)
            vals = shap_vals[0]
            base_val = float(explainer.expected_value)
            
        else:
            explainer = shap.TreeExplainer(model)
            shap_vals = explainer.shap_values(input_df)
            if isinstance(shap_vals, list):
                vals = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
            elif len(shap_vals.shape) == 3:
                vals = shap_vals[0, :, 1]
            else:
                vals = shap_vals[0]
                
            base_val = explainer.expected_value
            if isinstance(base_val, (list, np.ndarray)):
                base_val = float(base_val[1]) if len(base_val) > 1 else float(base_val[0])
            else:
                base_val = float(base_val)

        shap_dict = {col: float(vals[i]) for i, col in enumerate(feature_columns)}
        importance_list = sorted(
            [
                {
                    "feature": col,
                    "shap_value": float(vals[i]),
                    "abs_shap_value": float(abs(vals[i])),
                    "input_value": float(input_features.get(col, 0.0)),
                }
                for i, col in enumerate(feature_columns)
            ],
            key=lambda x: x["abs_shap_value"],
            reverse=True,
        )

        plot_b64 = _generate_shap_waterfall(vals, feature_columns, input_features)

        return {
            "shap_values": shap_dict,
            "feature_importance": importance_list,
            "base_value": base_val,
            "plot_base64": plot_b64,
        }

    except Exception as e:
        print(f"[central-xai] SHAP explanation error: {e}")
        return {"error": str(e)}
