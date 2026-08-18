"""
Tabular regressors backed by scikit-learn. All operate on engineered
feature matrices (see app/ml/features.py) to predict the next-step
NAV value.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression

from app.ml.models.base import BaseForecastModel


class LinearRegressionModel(BaseForecastModel):
    name = "linear_regression"
    data_mode = "tabular"

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "LinearRegressionModel":
        self.model = LinearRegression(**self.hyperparams)
        self.model.fit(X, y)
        self.is_fitted = True
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict(X)


class RandomForestModel(BaseForecastModel):
    name = "random_forest"
    data_mode = "tabular"

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "RandomForestModel":
        params = {"n_estimators": 300, "max_depth": 8, "random_state": 42, "n_jobs": -1}
        params.update(self.hyperparams)
        self.model = RandomForestRegressor(**params)
        self.model.fit(X, y)
        self.is_fitted = True
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict(X)

    def feature_importances(self, feature_names: list[str]) -> dict[str, float]:
        if not self.is_fitted:
            return {}
        return dict(zip(feature_names, self.model.feature_importances_.tolist()))


class GradientBoostingModel(BaseForecastModel):
    name = "gradient_boosting"
    data_mode = "tabular"

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "GradientBoostingModel":
        params = {"n_estimators": 300, "max_depth": 4, "learning_rate": 0.05, "random_state": 42}
        params.update(self.hyperparams)
        self.model = GradientBoostingRegressor(**params)
        self.model.fit(X, y)
        self.is_fitted = True
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict(X)
