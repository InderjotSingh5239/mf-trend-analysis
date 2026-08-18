"""
Multi-horizon NAV prediction engine.

Tabular models (Linear/RandomForest/GradientBoosting/XGBoost/LightGBM)
only predict one step ahead, so multi-day horizons are produced via
recursive forecasting: predict the next day, append it to the NAV
history, recompute features, predict the day after, and so on.

Sequence models (Prophet, LSTM, GRU) natively support multi-step
forecasting via their own `predict(steps)` method.

Note: recursive tabular forecasting recomputes the full feature
pipeline at every step, which is simple and correct but not the most
compute-efficient approach for long horizons (365 days). That's an
acceptable tradeoff for this foundation; an optimized incremental
feature updater can be swapped in later without changing the public
interface (`forecast_horizon`).
"""

from datetime import date, timedelta

from app.ml.features import build_feature_matrix
from app.ml.models.base import BaseForecastModel

HORIZONS_DAYS = (7, 30, 90, 180, 365)


def _recursive_tabular_forecast(
    nav_history: list[tuple], model: BaseForecastModel, feature_columns: list[str], max_horizon: int
) -> list[tuple[date, float]]:
    history = list(nav_history)
    predictions: list[tuple[date, float]] = []
    last_date = history[-1][0]

    for _ in range(max_horizon):
        next_date = last_date + timedelta(days=1)
        feature_df = build_feature_matrix(history)
        last_row = feature_df.iloc[[-1]].drop(columns=["nav"])
        last_row = last_row.reindex(columns=feature_columns)

        if last_row.isna().any(axis=None):
            # Not enough history yet to compute every rolling feature reliably.
            break

        predicted_nav = float(model.predict(last_row)[0])
        predictions.append((next_date, predicted_nav))
        history.append((next_date, predicted_nav))
        last_date = next_date

    return predictions


def _sequence_forecast(
    nav_history: list[tuple], model: BaseForecastModel, max_horizon: int
) -> list[tuple[date, float]]:
    last_date = nav_history[-1][0]
    values = model.predict(max_horizon)
    return [(last_date + timedelta(days=i + 1), float(v)) for i, v in enumerate(values)]


def forecast_horizon(
    nav_history: list[tuple],
    model: BaseForecastModel,
    feature_columns: list[str] | None,
    horizons: tuple[int, ...] = HORIZONS_DAYS,
) -> dict[int, tuple[date, float]]:
    """
    Returns {horizon_days: (target_date, predicted_nav)} for each
    requested horizon, using whichever forecasting strategy matches
    the model's data_mode.
    """
    max_horizon = max(horizons)

    if model.data_mode == "tabular":
        if feature_columns is None:
            raise ValueError("feature_columns is required for tabular models")
        series = _recursive_tabular_forecast(nav_history, model, feature_columns, max_horizon)
    else:
        series = _sequence_forecast(nav_history, model, max_horizon)

    result: dict[int, tuple[date, float]] = {}
    for horizon in horizons:
        if horizon <= len(series):
            result[horizon] = series[horizon - 1]
    return result


def generate_recommendation(expected_return_pct: float, confidence_score: float) -> str:
    """
    Simple, explainable heuristic: strong enough expected move plus
    reasonable model confidence drives a Buy/Sell call; otherwise Hold.
    Thresholds are intentionally conservative and easy to tune.
    """
    if confidence_score < 0.3:
        return "hold"
    if expected_return_pct >= 5.0:
        return "buy"
    if expected_return_pct <= -5.0:
        return "sell"
    return "hold"
