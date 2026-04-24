"""
FedCare AI — Predictions Endpoint
Real inference using trained global XGBClassifier (predict_proba).
Includes degenerate model detection, SHAP explanation.
"""
import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import DiseaseServer, Prediction
from app.schemas.prediction import PredictionInput, PredictionResponse, ExplanationResponse
from app.services.ai_service import (
    load_global_model, predict_single, is_model_degenerate,
)
from app.services.xai_service import (
    generate_shap_explanation, generate_global_feature_importance,
)

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.post("/predict", response_model=PredictionResponse)
async def make_prediction(
    data: PredictionInput,
    db: AsyncSession = Depends(get_db),
):
    """
    Run real inference on the global model for a server.
    Uses predict_proba — never hardcoded.
    """
    # Load server
    srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == data.server_id))
    server = srv_res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Load global model
    model = load_global_model(data.server_id)
    if model is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "No trained global model found for this server. "
                "Please upload datasets and run training first."
            ),
        )

    # Parse feature columns
    feature_columns = []
    if server.feature_columns:
        try:
            feature_columns = json.loads(server.feature_columns)
        except Exception:
            feature_columns = []

    # Use model's stored feature names if available
    if hasattr(model, "feature_names_in_") and model.feature_names_in_ is not None:
        feature_columns = list(model.feature_names_in_)

    if not feature_columns:
        raise HTTPException(
            status_code=400,
            detail="No feature columns configured for this server. Please retrain the model.",
        )

    # Check for degenerate model
    if is_model_degenerate(model, feature_columns):
        raise HTTPException(
            status_code=400,
            detail=(
                "The trained model is degenerate — it returns the same prediction for all inputs. "
                "This happens when the training dataset is too small (< 50 rows). "
                "Please upload a larger dataset (50+ rows) and retrain."
            ),
        )

    # Build features dict — only include known feature columns
    features = {col: float(data.features.get(col, 0.0)) for col in feature_columns}

    # Run real inference
    pred_result = predict_single(model, features, feature_columns)

    # SHAP explanation (best-effort)
    explanation_json = "{}"
    importance_json = "[]"
    try:
        explanation = generate_shap_explanation(data.server_id, features, feature_columns)
        if "error" not in explanation:
            explanation_json = json.dumps(explanation.get("shap_values", {}))
            importance_json = json.dumps(explanation.get("feature_importance", []))
    except Exception as e:
        print(f"[predict] SHAP failed (non-critical): {e}")

    # Persist prediction
    record = Prediction(
        server_id=data.server_id,
        input_data=json.dumps(features),
        prediction=pred_result["prediction"],
        prediction_label=pred_result["prediction_label"],
        confidence=pred_result["confidence"],
        probability_positive=pred_result["probability_positive"],
        probability_negative=pred_result["probability_negative"],
        explanation_data=explanation_json,
        feature_importance=importance_json,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return PredictionResponse(
        id=record.id,
        server_id=record.server_id,
        prediction=record.prediction,
        prediction_label=record.prediction_label,
        confidence=record.confidence,
        probability_positive=record.probability_positive,
        probability_negative=record.probability_negative,
        input_data=record.input_data,
        explanation_data=record.explanation_data,
        feature_importance=record.feature_importance,
        created_at=record.created_at,
    )


@router.get("/history/{server_id}", response_model=List[PredictionResponse])
async def get_prediction_history(
    server_id: int,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Return recent prediction history for a server."""
    result = await db.execute(
        select(Prediction)
        .where(Prediction.server_id == server_id)
        .order_by(Prediction.created_at.desc())
        .limit(limit)
    )
    predictions = result.scalars().all()

    return [
        PredictionResponse(
            id=p.id,
            server_id=p.server_id,
            prediction=p.prediction,
            prediction_label=p.prediction_label,
            confidence=p.confidence,
            probability_positive=p.probability_positive,
            probability_negative=p.probability_negative,
            input_data=p.input_data,
            explanation_data=p.explanation_data,
            feature_importance=p.feature_importance,
            created_at=p.created_at,
        )
        for p in predictions
    ]


@router.get("/explain/{prediction_id}", response_model=ExplanationResponse)
async def explain_prediction(
    prediction_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Re-generate SHAP explanation for a stored prediction."""
    pred_res = await db.execute(select(Prediction).where(Prediction.id == prediction_id))
    prediction = pred_res.scalar_one_or_none()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    srv_res = await db.execute(
        select(DiseaseServer).where(DiseaseServer.id == prediction.server_id)
    )
    server = srv_res.scalar_one_or_none()

    feature_columns = []
    if server and server.feature_columns:
        try:
            feature_columns = json.loads(server.feature_columns)
        except Exception:
            pass

    model = load_global_model(prediction.server_id)
    if model and hasattr(model, "feature_names_in_") and model.feature_names_in_ is not None:
        feature_columns = list(model.feature_names_in_)

    input_data = json.loads(prediction.input_data or "{}")
    explanation = generate_shap_explanation(prediction.server_id, input_data, feature_columns)

    if "error" in explanation:
        raise HTTPException(status_code=500, detail=explanation["error"])

    return ExplanationResponse(
        prediction_id=prediction.id,
        prediction_label=prediction.prediction_label,
        confidence=prediction.confidence,
        shap_values=explanation.get("shap_values", {}),
        feature_importance=explanation.get("feature_importance", []),
        base_value=explanation.get("base_value", 0),
        plot_base64=explanation.get("plot_base64"),
    )


@router.get("/feature-importance/{server_id}")
async def get_feature_importance(
    server_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Return global feature importance for a server's model."""
    srv_res = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = srv_res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    feature_columns = []
    try:
        feature_columns = json.loads(server.feature_columns or "[]")
    except Exception:
        pass

    model = load_global_model(server_id)
    if model and hasattr(model, "feature_names_in_") and model.feature_names_in_ is not None:
        feature_columns = list(model.feature_names_in_)

    result = generate_global_feature_importance(server_id, feature_columns)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
