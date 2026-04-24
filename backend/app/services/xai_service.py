"""
FedCare AI — XAI Service
Real SHAP explanations using TreeExplainer on sklearn XGBClassifier.
"""
import os
import io
import base64
import numpy as np
import pandas as pd
import shap
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from typing import Dict, List, Optional

from app.services.ai_service import load_global_model, load_model


# ─── Per-Prediction SHAP ─────────────────────────────────────────────────────

def generate_shap_explanation(
    server_id: int,
    input_features: Dict[str, float],
    feature_columns: List[str],
) -> Dict:
    """
    Generate SHAP explanation for a single prediction.
    Returns shap_values dict, feature importance list, base value, and plot.
    """
    model = load_global_model(server_id)
    if model is None:
        # Fallback to old load_model (raw booster)
        model = load_model(server_id)
    if model is None:
        return {"error": "No trained model found. Please train the model first."}

    # Build input dataframe
    input_vec = np.array([[float(input_features.get(col, 0.0)) for col in feature_columns]])
    input_df = pd.DataFrame(input_vec, columns=feature_columns)

    try:
        explainer = shap.TreeExplainer(model)
        shap_vals = explainer.shap_values(input_df)

        # Handle multiclass or binary output
        if isinstance(shap_vals, list):
            # Binary: list has 2 arrays [neg_class, pos_class]
            vals = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
        elif len(shap_vals.shape) == 3:
            # 3D: (samples, features, classes) — take positive class
            vals = shap_vals[0, :, 1]
        else:
            vals = shap_vals[0]

        # Build output dict
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

        # Base value
        base_val = explainer.expected_value
        if isinstance(base_val, (list, np.ndarray)):
            base_val = float(base_val[1]) if len(base_val) > 1 else float(base_val[0])
        else:
            base_val = float(base_val)

        # Plot
        plot_b64 = _generate_shap_waterfall(vals, feature_columns, input_features)

        return {
            "shap_values": shap_dict,
            "feature_importance": importance_list,
            "base_value": base_val,
            "plot_base64": plot_b64,
        }

    except Exception as e:
        print(f"[xai] SHAP error: {e}")
        return {"error": str(e)}


# ─── Global Feature Importance ────────────────────────────────────────────────

def generate_global_feature_importance(
    server_id: int,
    feature_columns: List[str],
) -> Dict:
    """
    Compute global feature importance from the trained global model.
    Uses XGBClassifier's built-in feature_importances_ (gain-based).
    """
    model = load_global_model(server_id)
    if model is None:
        model = load_model(server_id)
    if model is None:
        return {"error": "No trained model found."}

    try:
        importances = model.feature_importances_  # gain-based by default
        feature_list = sorted(
            [
                {
                    "feature": col,
                    "importance": float(importances[i]) if i < len(importances) else 0.0,
                }
                for i, col in enumerate(feature_columns)
            ],
            key=lambda x: x["importance"],
            reverse=True,
        )

        # Also try weight and cover from booster
        booster = model.get_booster()
        importance_by_type = {}
        for imp_type in ["weight", "gain", "cover"]:
            try:
                scores = booster.get_score(importance_type=imp_type)
                importance_by_type[imp_type] = {
                    col: float(scores.get(col, 0)) for col in feature_columns
                }
            except Exception:
                importance_by_type[imp_type] = {col: 0.0 for col in feature_columns}

        # Normalized gain
        gain_scores = importance_by_type.get("gain", {})
        total = sum(gain_scores.values()) or 1.0
        normalized = {k: v / total for k, v in gain_scores.items()}

        # Generate importance chart
        chart_b64 = _generate_importance_chart(feature_list[:15])

        return {
            "feature_ranking": feature_list,
            "normalized_importance": normalized,
            "importance_by_type": importance_by_type,
            "chart_base64": chart_b64,
        }

    except Exception as e:
        print(f"[xai] Feature importance error: {e}")
        return {"error": str(e)}


# ─── Plot Helpers ─────────────────────────────────────────────────────────────

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

        # Add value labels
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
        print(f"[xai] SHAP plot error: {e}")
        return None


def _generate_importance_chart(feature_list: List[Dict]) -> Optional[str]:
    """Generate global feature importance bar chart as base64 PNG."""
    try:
        names = [f["feature"] for f in feature_list]
        values = [f["importance"] for f in feature_list]

        fig, ax = plt.subplots(figsize=(10, max(5, len(names) * 0.5 + 2)))
        palette = [
            "#667eea", "#764ba2", "#00d2ff", "#43e97b", "#f093fb",
            "#4facfe", "#f5576c", "#ffd200", "#38f9d7", "#fa709a",
        ]
        colors = [palette[i % len(palette)] for i in range(len(names))]

        ax.barh(names[::-1], values[::-1], color=colors[::-1], edgecolor="none", height=0.6)
        ax.set_xlabel("Feature Importance (Gain)", fontsize=11)
        ax.set_title("Global Feature Importance — XGBoost Model", fontsize=13, fontweight="bold")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.tick_params(labelsize=10)

        plt.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")
    except Exception as e:
        print(f"[xai] Importance chart error: {e}")
        return None
