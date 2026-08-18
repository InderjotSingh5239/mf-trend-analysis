import random
from datetime import date, timedelta

from app.ml.features import build_feature_matrix
from app.ml.models.sklearn_models import RandomForestModel
from app.ml.prediction_engine import forecast_horizon, generate_recommendation


def _synthetic_nav_history(n_days: int = 500, seed: int = 7) -> list[tuple]:
    rng = random.Random(seed)
    start = date(2025, 1, 1)
    nav = 100.0
    history = []
    for i in range(n_days):
        nav *= 1 + rng.gauss(0.0004, 0.008)
        history.append((start + timedelta(days=i), nav))
    return history


def _fit_random_forest(history):
    feat = build_feature_matrix(history).dropna()
    target = feat["nav"].shift(-1).dropna()
    X = feat.loc[target.index].drop(columns=["nav"])
    model = RandomForestModel()
    model.fit(X, target)
    return model, X.columns.tolist()


def test_forecast_horizon_returns_requested_horizons():
    history = _synthetic_nav_history()
    model, feature_columns = _fit_random_forest(history)

    forecasts = forecast_horizon(history, model, feature_columns, horizons=(7, 30))

    assert 7 in forecasts
    assert 30 in forecasts
    target_date_7, predicted_nav_7 = forecasts[7]
    assert target_date_7 == history[-1][0] + timedelta(days=7)
    assert predicted_nav_7 > 0


def test_forecast_horizon_dates_are_sequential():
    history = _synthetic_nav_history()
    model, feature_columns = _fit_random_forest(history)

    forecasts = forecast_horizon(history, model, feature_columns, horizons=(7, 30, 90))
    dates = [forecasts[h][0] for h in (7, 30, 90) if h in forecasts]
    assert dates == sorted(dates)


def test_generate_recommendation_buy_on_strong_positive_return():
    assert generate_recommendation(expected_return_pct=8.0, confidence_score=0.8) == "buy"


def test_generate_recommendation_sell_on_strong_negative_return():
    assert generate_recommendation(expected_return_pct=-8.0, confidence_score=0.8) == "sell"


def test_generate_recommendation_hold_on_low_confidence():
    assert generate_recommendation(expected_return_pct=10.0, confidence_score=0.1) == "hold"


def test_generate_recommendation_hold_on_small_move():
    assert generate_recommendation(expected_return_pct=1.0, confidence_score=0.9) == "hold"
