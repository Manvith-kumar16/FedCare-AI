"""Explainable AI Service - SHAP for XGBoost"""
import os
import json
import base64
import io
import numpy as np
import pandas as pd
import xgboost as xgb
import shap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Dict, List, Optional
from app.services.ai_service import FEATURE_COLUMNS, load_model


def generate_shap_explanation(
    server_id: int,
    input_features: Dict[str, float],
) -> Dict:
    """Generate SHAP explanation for a prediction."""
    model = load_model(server_id)
    if model is None:
        return {"error": "No trained model found"}

    # Create input array
    input_array = np.array([[input_features.get(col, 0) for col in FEATURE_COLUMNS]])
    input_df = pd.DataFrame(input_array, columns=FEATURE_COLUMNS)

    # Create SHAP explainer
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(input_df)

    if isinstance(shap_values, list):
        shap_vals = shap_values[0] if len(shap_values) > 0 else shap_values
    else:
        shap_vals = shap_values

    if len(shap_vals.shape) > 1:
        shap_vals = shap_vals[0]

    # Build per-feature breakdown
    shap_dict = {}
    feature_importance_list = []
    for i, col in enumerate(FEATURE_COLUMNS):
        val = float(shap_vals[i])
        shap_dict[col] = val
        feature_importance_list.append({
            "feature": col,
            "shap_value": val,
            "abs_shap_value": abs(val),
            "input_value": float(input_features.get(col, 0)),
        })

    # Sort by absolute SHAP value
    feature_importance_list.sort(key=lambda x: x["abs_shap_value"], reverse=True)

    # Get base value
    base_value = float(explainer.expected_value)
    if isinstance(explainer.expected_value, np.ndarray):
        base_value = float(explainer.expected_value[0])

    # Generate SHAP bar plot as base64
    plot_base64 = _generate_shap_plot(shap_vals, FEATURE_COLUMNS, input_features)

    return {
        "shap_values": shap_dict,
        "feature_importance": feature_importance_list,
        "base_value": base_value,
        "plot_base64": plot_base64,
    }


def generate_global_feature_importance(server_id: int) -> Dict:
    """Generate global feature importance from the model."""
    model = load_model(server_id)
    if model is None:
        return {"error": "No trained model found"}

    # Get feature importance scores
    importance_types = ["weight", "gain", "cover"]
    importance_data = {}

    for imp_type in importance_types:
        try:
            scores = model.get_score(importance_type=imp_type)
            importance_data[imp_type] = {
                col: float(scores.get(col, 0)) for col in FEATURE_COLUMNS
            }
        except Exception:
            importance_data[imp_type] = {col: 0.0 for col in FEATURE_COLUMNS}

    # Normalize gain-based importance
    gain_scores = importance_data.get("gain", {})
    total_gain = sum(gain_scores.values()) or 1.0
    normalized = {k: v / total_gain for k, v in gain_scores.items()}

    feature_list = [
        {"feature": col, "importance": normalized.get(col, 0)}
        for col in FEATURE_COLUMNS
    ]
    feature_list.sort(key=lambda x: x["importance"], reverse=True)

    return {
        "importance_by_type": importance_data,
        "normalized_importance": normalized,
        "feature_ranking": feature_list,
    }


def _generate_shap_plot(
    shap_values: np.ndarray,
    feature_names: List[str],
    input_features: Dict[str, float],
) -> Optional[str]:
    """Generate SHAP waterfall plot as base64 encoded image."""
    try:
        fig, ax = plt.subplots(figsize=(10, 6))

        # Create bar plot with positive/negative coloring
        colors = ['#e74c3c' if v > 0 else '#2ecc71' for v in shap_values]
        sorted_idx = np.argsort(np.abs(shap_values))

        ax.barh(
            [feature_names[i] for i in sorted_idx],
            [shap_values[i] for i in sorted_idx],
            color=[colors[i] for i in sorted_idx],
            edgecolor='none',
            height=0.6,
        )

        ax.set_xlabel('SHAP Value (impact on prediction)', fontsize=12, fontweight='bold')
        ax.set_title('Feature Impact on Diabetes Prediction', fontsize=14, fontweight='bold')
        ax.axvline(x=0, color='#555', linewidth=0.8, linestyle='--')

        # Style
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.tick_params(labelsize=11)
        plt.tight_layout()

        # Convert to base64
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        plt.close(fig)
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        return img_base64

    except Exception as e:
        print(f"Error generating SHAP plot: {e}")
        return None
