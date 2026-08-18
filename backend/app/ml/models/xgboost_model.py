"""
XGBoost tabular regressor wrapper.

XGBoost is a heavy optional dependency; the import is deferred to
fit() so the rest of the ML package (and the app as a whole) still
imports cleanly in environments where it isn't installed — the
trainer catches ImportError and simply excludes this model from the
leaderboard (same pattern used for TensorFlow/LSTM, LightGBM, CatBoost).
"""

import numpy as np
import pandas as pd

from app.ml.models.base import BaseForecastModel


class XGBoostModel(BaseForecastModel):
    name = "xgboost"
    data_mode = "tabular"

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "XGBoostModel":
        try:
            import xgboost as xgb
        except ImportError as exc:
            raise ImportError(
                "xgboost is not installed. Install it to enable this model."
            ) from exc

        params = {
            "n_estimators": 400,
            "max_depth": 5,
            "learning_rate": 0.03,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "objective": "reg:squarederror",
            "random_state": 42,
            "n_jobs": -1,
        }
        params.update(self.hyperparams)
        self.model = xgb.XGBRegressor(**params)
        self.model.fit(X, y)
        self.is_fitted = True
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict(X)

    def feature_importances(self, feature_names: list[str]) -> dict[str, float]:
        if not self.is_fitted:
            return {}
        return dict(zip(feature_names, self.model.feature_importances_.tolist()))
