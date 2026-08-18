"""
LightGBM and CatBoost tabular regressor wrappers.
"""

import lightgbm as lgb
import numpy as np
import pandas as pd

from app.ml.models.base import BaseForecastModel


class LightGBMModel(BaseForecastModel):
    name = "lightgbm"
    data_mode = "tabular"

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "LightGBMModel":
        params = {
            "n_estimators": 400,
            "max_depth": 6,
            "learning_rate": 0.03,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "random_state": 42,
            "n_jobs": -1,
            "verbosity": -1,
        }
        params.update(self.hyperparams)
        self.model = lgb.LGBMRegressor(**params)
        self.model.fit(X, y)
        self.is_fitted = True
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict(X)

    def feature_importances(self, feature_names: list[str]) -> dict[str, float]:
        if not self.is_fitted:
            return {}
        return dict(zip(feature_names, self.model.feature_importances_.tolist()))


class CatBoostModel(BaseForecastModel):
    """
    Optional — only used if the `catboost` package is installed.
    Imported lazily so its absence doesn't break the rest of the
    training pipeline (it is not in the core requirements.txt to
    keep the base image lean; add it if you want this model in the
    leaderboard).
    """

    name = "catboost"
    data_mode = "tabular"

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "CatBoostModel":
        try:
            from catboost import CatBoostRegressor
        except ImportError as exc:
            raise ImportError(
                "catboost is not installed. Add `catboost` to requirements.txt to enable this model."
            ) from exc

        params = {"iterations": 400, "depth": 6, "learning_rate": 0.03, "verbose": False, "random_seed": 42}
        params.update(self.hyperparams)
        self.model = CatBoostRegressor(**params)
        self.model.fit(X, y)
        self.is_fitted = True
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict(X)
