"""
Facebook Prophet wrapper — operates directly on the (date, nav)
series rather than the engineered tabular feature matrix, since
Prophet does its own trend/seasonality decomposition internally.
"""

import numpy as np
import pandas as pd
from prophet import Prophet

from app.ml.models.base import BaseForecastModel


class ProphetModel(BaseForecastModel):
    name = "prophet"
    data_mode = "sequence"

    def fit(self, series: pd.Series) -> "ProphetModel":
        df = series.reset_index()
        df.columns = ["ds", "y"]

        params = {
            "daily_seasonality": False,
            "weekly_seasonality": True,
            "yearly_seasonality": True,
            "changepoint_prior_scale": 0.05,
        }
        params.update(self.hyperparams)

        self.model = Prophet(**params)
        self.model.fit(df)
        self._last_date = df["ds"].max()
        self.is_fitted = True
        return self

    def predict(self, steps: int) -> np.ndarray:
        future = self.model.make_future_dataframe(periods=steps, freq="D", include_history=False)
        forecast = self.model.predict(future)
        return forecast["yhat"].to_numpy()

    def predict_with_bounds(self, steps: int) -> pd.DataFrame:
        """Returns yhat, yhat_lower, yhat_upper for confidence-interval based scoring."""
        future = self.model.make_future_dataframe(periods=steps, freq="D", include_history=False)
        forecast = self.model.predict(future)
        return forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]]
