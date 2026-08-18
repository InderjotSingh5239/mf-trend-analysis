"""
Prediction service — loads a fund's best trained model, runs the
multi-horizon forecasting engine, computes risk/confidence scores
and a buy/hold/sell recommendation with an explanation, and persists
the results.
"""

import uuid
from datetime import date

from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.data_loader import load_nav_series
from app.ml.explainability import compute_shap_feature_importance, top_features_explanation
from app.ml.features import build_feature_matrix, compute_risk_metrics
from app.ml.models.base import BaseForecastModel
from app.ml.prediction_engine import HORIZONS_DAYS, forecast_horizon, generate_recommendation
from app.ml.training.evaluation import confidence_score_from_rmse
from app.models.ml import MLModel
from app.models.mutual_fund import MutualFund
from app.models.prediction import Prediction, Recommendation


class NoTrainedModelError(Exception):
    pass


def _load_best_model_record(db: Session, fund_id: uuid.UUID) -> MLModel:
    stmt = select(MLModel).where(MLModel.fund_id == fund_id, MLModel.is_best.is_(True))
    best = db.execute(stmt).scalar_one_or_none()
    if best is None:
        raise NoTrainedModelError(
            "No trained model found for this fund. Trigger training first via "
            "POST /api/v1/ml/train/{fund_id}."
        )
    return best


def _load_model_artifact(record: MLModel) -> BaseForecastModel:
    from app.ml.models.lstm_model import GRUModel, LSTMModel

    if record.model_name in ("lstm", "gru"):
        cls = LSTMModel if record.model_name == "lstm" else GRUModel
        return cls.load(record.artifact_path)

    return BaseForecastModel.load(record.artifact_path)


def generate_predictions_for_fund(db: Session, fund: MutualFund) -> list[Prediction]:
    """
    Generates and persists a fresh Prediction row for every horizon
    in HORIZONS_DAYS, using the fund's currently-best trained model.
    """
    best_record = _load_best_model_record(db, fund.id)
    model = _load_model_artifact(best_record)

    nav_history = load_nav_series(db, fund.id)
    current_nav = nav_history[-1][1]

    feature_columns = None
    rmse = None
    importance = {}

    if model.data_mode == "tabular":
        feature_df = build_feature_matrix(nav_history).dropna()
        feature_columns = [c for c in feature_df.columns if c != "nav"]
        if hasattr(model, "feature_importances"):
            importance = model.feature_importances(feature_columns)
        else:
            importance = compute_shap_feature_importance(
                getattr(model, "model", model), feature_df[feature_columns]
            )

    # Pull RMSE from the model's stored metrics for confidence scoring.
    if best_record.metrics:
        rmse = best_record.metrics[-1].rmse

    forecasts = forecast_horizon(nav_history, model, feature_columns, HORIZONS_DAYS)

    nav_series = build_feature_matrix(nav_history)["nav"]
    daily_returns = nav_series.pct_change()
    risk_metrics = compute_risk_metrics(daily_returns)
    ann_vol = risk_metrics.get("annualized_volatility", 0.0) or 0.0
    risk_score = float(min(100.0, ann_vol * 100))

    explanation_text = (
        top_features_explanation(importance)
        if importance
        else (
            f"Forecast produced by the {model.name} time-series model based on historical NAV trend and seasonality."
        )
    )

    # Clear previous "latest" predictions for this fund before inserting new ones.
    db.query(Prediction).filter(Prediction.fund_id == fund.id).delete()

    saved: list[Prediction] = []
    today = date.today()

    for horizon_days in HORIZONS_DAYS:
        if horizon_days not in forecasts:
            continue

        target_date, predicted_nav = forecasts[horizon_days]
        expected_return_pct = ((predicted_nav - current_nav) / current_nav) * 100

        confidence = confidence_score_from_rmse(rmse, current_nav) if rmse else 0.5
        recommendation = generate_recommendation(expected_return_pct, confidence)

        margin = (rmse or (current_nav * 0.02)) * 1.96
        lower_bound = predicted_nav - margin
        upper_bound = predicted_nav + margin

        prediction = Prediction(
            fund_id=fund.id,
            model_id=best_record.id,
            horizon_days=horizon_days,
            prediction_date=today,
            target_date=target_date,
            predicted_nav=predicted_nav,
            expected_return_pct=expected_return_pct,
            confidence_score=confidence,
            risk_score=risk_score,
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            recommendation=Recommendation(recommendation),
            explanation=explanation_text,
        )
        db.add(prediction)
        saved.append(prediction)

    db.commit()
    for p in saved:
        db.refresh(p)

    logger.info(
        "Generated {} horizon predictions for {} using model {}",
        len(saved),
        fund.scheme_code,
        best_record.model_name,
    )
    return saved


def get_latest_predictions(db: Session, fund_id: uuid.UUID) -> list[Prediction]:
    stmt = select(Prediction).where(Prediction.fund_id == fund_id).order_by(Prediction.horizon_days)
    return list(db.execute(stmt).scalars().all())
