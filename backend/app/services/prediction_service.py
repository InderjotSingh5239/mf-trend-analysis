"""
Prediction service.

Loads the best trained model for a mutual fund, generates forecasts for
all supported horizons, calculates risk/confidence/recommendation values,
and persists the latest prediction snapshot.
"""

from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.data_loader import load_nav_series
from app.ml.explainability import (
    compute_shap_feature_importance,
    top_features_explanation,
)
from app.ml.features import build_feature_matrix, compute_risk_metrics
from app.ml.models.base import BaseForecastModel
from app.ml.prediction_engine import (
    HORIZONS_DAYS,
    forecast_horizon,
    generate_recommendation,
)
from app.ml.training.evaluation import confidence_score_from_rmse
from app.models.ml import MLModel, ModelStatus
from app.models.mutual_fund import MutualFund
from app.models.prediction import Prediction, PredictionHistory, Recommendation


class NoTrainedModelError(Exception):
    """Raised when a fund has no usable trained model."""


class PredictionGenerationError(Exception):
    """Raised when prediction generation cannot be completed."""


def _safe_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        result = float(value)
        return None if result != result else result
    except (TypeError, ValueError):
        return None


def _load_best_model_record(db: Session, fund_id: uuid.UUID) -> MLModel:
    stmt = (
        select(MLModel)
        .where(
            MLModel.fund_id == fund_id,
            MLModel.is_best.is_(True),
            MLModel.status == ModelStatus.READY,
        )
        .order_by(MLModel.created_at.desc())
    )
    best = db.execute(stmt).scalars().first()

    if best is None:
        raise NoTrainedModelError(
            "No ready trained model found for this fund. "
            "An administrator must train the fund first via "
            f"POST /api/v1/ml/train/{fund_id}."
        )

    if not best.artifact_path:
        raise NoTrainedModelError(
            "The selected trained model has no artifact path."
        )

    return best


def _load_model_artifact(record: MLModel) -> BaseForecastModel:
    from app.ml.models.lstm_model import GRUModel, LSTMModel

    try:
        if record.model_name == "lstm":
            return LSTMModel.load(record.artifact_path)
        if record.model_name == "gru":
            return GRUModel.load(record.artifact_path)
        return BaseForecastModel.load(record.artifact_path)
    except Exception as exc:
        logger.exception(
            "Unable to load model artifact {} for model {}",
            record.artifact_path,
            record.id,
        )
        raise PredictionGenerationError(
            "The trained model artifact could not be loaded."
        ) from exc


def _extract_rmse(metrics: Any) -> float | None:
    if not metrics:
        return None

    if isinstance(metrics, dict):
        direct = _safe_float(metrics.get("rmse"))
        if direct is not None:
            return direct
        metrics = metrics.get("metrics")

    if isinstance(metrics, list):
        for item in reversed(metrics):
            value = (
                item.get("rmse")
                if isinstance(item, dict)
                else getattr(item, "rmse", None)
            )
            parsed = _safe_float(value)
            if parsed is not None:
                return parsed

    return None


def _calculate_confidence(rmse: float | None, current_nav: float) -> float:
    if rmse is None or current_nav <= 0:
        return 0.5

    try:
        value = float(
            confidence_score_from_rmse(rmse, current_nav)
        )
        return max(0.0, min(1.0, value))
    except Exception:
        logger.warning(
            "Confidence calculation failed; using neutral confidence."
        )
        return 0.5


def _calculate_risk_score(
    nav_history: list[tuple[date, float]],
) -> float:
    if len(nav_history) < 2:
        return 0.0

    try:
        frame = build_feature_matrix(nav_history)
        returns = frame["nav"].pct_change().dropna()

        if returns.empty:
            return 0.0

        metrics = compute_risk_metrics(returns)
        volatility = _safe_float(
            metrics.get("annualized_volatility")
        ) or 0.0

        return max(0.0, min(100.0, volatility * 100.0))
    except Exception:
        logger.exception("Risk metric calculation failed.")
        return 0.0


def _build_explanation(
    model: BaseForecastModel,
    importance: dict[str, float],
) -> str:
    if importance:
        try:
            text = top_features_explanation(importance)
            if text:
                return text
        except Exception:
            logger.warning(
                "Feature-importance explanation failed."
            )

    name = getattr(model, "name", None) or model.__class__.__name__
    return (
        f"Forecast generated using the {name} model from historical "
        "NAV data and model-derived time-series patterns."
    )


def generate_predictions_for_fund(
    db: Session,
    fund: MutualFund,
) -> list[Prediction]:
    if fund is None:
        raise PredictionGenerationError("Fund is required.")

    best_record = _load_best_model_record(db, fund.id)
    model = _load_model_artifact(best_record)

    nav_history = load_nav_series(db, fund.id)
    if not nav_history:
        raise PredictionGenerationError(
            "No NAV history is available for this fund."
        )

    current_nav = _safe_float(nav_history[-1][1])
    if current_nav is None or current_nav <= 0:
        raise PredictionGenerationError(
            "The latest NAV is invalid or unavailable."
        )

    feature_columns: list[str] | None = None
    importance: dict[str, float] = {}

    if getattr(model, "data_mode", None) == "tabular":
        feature_df = build_feature_matrix(nav_history).dropna()
        if feature_df.empty:
            raise PredictionGenerationError(
                "Insufficient NAV history to build prediction features."
            )

        feature_columns = [
            column
            for column in feature_df.columns
            if column != "nav"
        ]

        if feature_columns:
            try:
                if hasattr(model, "feature_importances"):
                    importance = (
                        model.feature_importances(feature_columns)
                        or {}
                    )
                else:
                    importance = (
                        compute_shap_feature_importance(
                            getattr(model, "model", model),
                            feature_df[feature_columns],
                        )
                        or {}
                    )
            except Exception:
                logger.warning(
                    "Feature importance failed for fund {}.",
                    fund.id,
                )

    rmse = _extract_rmse(best_record.metrics)
    confidence = _calculate_confidence(rmse, current_nav)

    try:
        forecasts = forecast_horizon(
            nav_history,
            model,
            feature_columns,
            HORIZONS_DAYS,
        )
    except Exception as exc:
        logger.exception(
            "Forecast generation failed for fund {}",
            fund.id,
        )
        raise PredictionGenerationError(
            "The prediction model failed to generate a forecast."
        ) from exc

    if not forecasts:
        raise PredictionGenerationError(
            "The prediction model returned no forecast results."
        )

    risk_score = _calculate_risk_score(nav_history)
    explanation = _build_explanation(model, importance)
    today = date.today()

    predictions: list[Prediction] = []

    for horizon_days in HORIZONS_DAYS:
        forecast = forecasts.get(horizon_days)
        if not forecast:
            continue

        target_date, predicted_raw = forecast
        predicted_nav = _safe_float(predicted_raw)

        if predicted_nav is None or predicted_nav <= 0:
            logger.warning(
                "Invalid prediction for {} days / fund {}",
                horizon_days,
                fund.id,
            )
            continue

        expected_return_pct = (
            (predicted_nav - current_nav) / current_nav
        ) * 100.0

        recommendation_raw = generate_recommendation(
            expected_return_pct,
            confidence,
        )

        try:
            recommendation = Recommendation(recommendation_raw)
        except ValueError:
            recommendation = Recommendation.HOLD

        base_error = rmse or current_nav * 0.02
        horizon_multiplier = max(
            1.0,
            (horizon_days / 30.0) ** 0.5,
        )
        margin = max(
            current_nav * 0.01,
            base_error * 1.96 * horizon_multiplier,
        )

        predictions.append(
            Prediction(
                fund_id=fund.id,
                model_id=best_record.id,
                horizon_days=horizon_days,
                prediction_date=today,
                target_date=target_date,
                predicted_nav=predicted_nav,
                expected_return_pct=expected_return_pct,
                confidence_score=confidence,
                risk_score=risk_score,
                lower_bound=max(0.0, predicted_nav - margin),
                upper_bound=predicted_nav + margin,
                recommendation=recommendation,
                explanation=explanation,
            )
        )

    if not predictions:
        raise PredictionGenerationError(
            "No valid predictions were generated for this fund."
        )

    previous_predictions = (
        db.query(Prediction)
        .filter(Prediction.fund_id == fund.id)
        .all()
    )

    # Preserve the previous snapshot for later drift/error analysis.
    if previous_predictions:
        db.add_all(
            [
                PredictionHistory(
                    fund_id=item.fund_id,
                    model_id=item.model_id,
                    horizon_days=item.horizon_days,
                    prediction_date=item.prediction_date,
                    target_date=item.target_date,
                    predicted_nav=item.predicted_nav,
                    expected_return_pct=item.expected_return_pct,
                    confidence_score=item.confidence_score,
                    risk_score=item.risk_score,
                    lower_bound=item.lower_bound,
                    upper_bound=item.upper_bound,
                    recommendation=item.recommendation,
                    explanation=item.explanation,
                )
                for item in previous_predictions
            ]
        )

    db.query(Prediction).filter(
        Prediction.fund_id == fund.id
    ).delete(synchronize_session=False)

    db.add_all(predictions)
    db.commit()

    for prediction in predictions:
        db.refresh(prediction)

    logger.info(
        "Generated {} predictions for {} using {}",
        len(predictions),
        fund.scheme_code,
        best_record.model_name,
    )
    return predictions


def get_latest_predictions(
    db: Session,
    fund_id: uuid.UUID,
) -> list[Prediction]:
    stmt = (
        select(Prediction)
        .where(Prediction.fund_id == fund_id)
        .order_by(Prediction.horizon_days.asc())
    )
    return list(db.execute(stmt).scalars().all())
