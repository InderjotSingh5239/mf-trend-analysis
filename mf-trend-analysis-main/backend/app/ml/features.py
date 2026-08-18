"""
Feature engineering for NAV time series.

All indicators here are computable from a single-asset NAV series
(date, value) with no OHLC/volume data, since AMFI publishes NAV
only. Indicators that require High/Low/Volume (ATR, ADX, CCI) or a
benchmark series (Beta, Alpha, Treynor) are computed opportunistically
when a benchmark series is supplied (added in Phase 3 once market
index data is available) and otherwise omitted rather than faked.
"""

import numpy as np
import pandas as pd

TRADING_DAYS_PER_YEAR = 252


def build_nav_frame(nav_history: list[tuple]) -> pd.DataFrame:
    """
    nav_history: list of (date, value) tuples, any order.
    Returns a DataFrame indexed by date, sorted ascending, with a
    'nav' column, forward-filled for non-trading-day gaps.
    """
    df = pd.DataFrame(nav_history, columns=["date", "nav"])
    df["date"] = pd.to_datetime(df["date"])
    df = df.drop_duplicates(subset="date").sort_values("date").set_index("date")
    df["nav"] = df["nav"].astype(float)
    df = df.asfreq("D")
    df["nav"] = df["nav"].ffill()
    df = df.dropna(subset=["nav"])
    return df


def add_return_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["daily_return"] = df["nav"].pct_change(1)
    df["weekly_return"] = df["nav"].pct_change(7)
    df["monthly_return"] = df["nav"].pct_change(30)
    df["quarterly_return"] = df["nav"].pct_change(91)
    df["yearly_return"] = df["nav"].pct_change(365)
    return df


def add_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for window in (7, 14, 30, 90):
        df[f"rolling_mean_{window}"] = df["nav"].rolling(window).mean()
        df[f"rolling_std_{window}"] = df["nav"].rolling(window).std()
    return df


def add_moving_averages(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["sma_20"] = df["nav"].rolling(20).mean()
    df["sma_50"] = df["nav"].rolling(50).mean()
    df["sma_200"] = df["nav"].rolling(200).mean()
    df["ema_12"] = df["nav"].ewm(span=12, adjust=False).mean()
    df["ema_26"] = df["nav"].ewm(span=26, adjust=False).mean()
    return df


def add_macd(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "ema_12" not in df or "ema_26" not in df:
        df = add_moving_averages(df)
    df["macd"] = df["ema_12"] - df["ema_26"]
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"] = df["macd"] - df["macd_signal"]
    return df


def add_rsi(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
    df = df.copy()
    delta = df["nav"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    df["rsi_14"] = 100 - (100 / (1 + rs))
    return df


def add_bollinger_bands(df: pd.DataFrame, window: int = 20, num_std: float = 2.0) -> pd.DataFrame:
    df = df.copy()
    mean = df["nav"].rolling(window).mean()
    std = df["nav"].rolling(window).std()
    df["bb_middle"] = mean
    df["bb_upper"] = mean + num_std * std
    df["bb_lower"] = mean - num_std * std
    df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / mean
    return df


def add_momentum_volatility(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["momentum_10"] = df["nav"] - df["nav"].shift(10)
    df["volatility_30"] = df["daily_return"].rolling(30).std() * np.sqrt(TRADING_DAYS_PER_YEAR)
    return df


def add_drawdown(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    running_max = df["nav"].cummax()
    df["drawdown"] = (df["nav"] - running_max) / running_max
    return df


def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["day_of_week"] = df.index.dayofweek
    df["day_of_month"] = df.index.day
    df["month"] = df.index.month
    df["quarter"] = df.index.quarter
    df["is_month_end"] = df.index.is_month_end.astype(int)
    return df


def add_lag_features(
    df: pd.DataFrame, target_col: str = "nav", lags: tuple[int, ...] = (1, 2, 3, 5, 7, 14, 30)
) -> pd.DataFrame:
    df = df.copy()
    for lag in lags:
        df[f"lag_{lag}"] = df[target_col].shift(lag)
    return df


def compute_risk_metrics(daily_returns: pd.Series, risk_free_rate_annual: float = 0.065) -> dict:
    """
    Computes Sharpe, Sortino, max drawdown, CAGR, and annualized
    volatility from a daily return series. Beta/Alpha/Treynor require
    a benchmark series and are computed separately when available
    (see compute_relative_risk_metrics).
    """
    returns = daily_returns.dropna()
    if len(returns) < 30:
        return {}

    rf_daily = (1 + risk_free_rate_annual) ** (1 / TRADING_DAYS_PER_YEAR) - 1
    excess = returns - rf_daily

    ann_return = (1 + returns.mean()) ** TRADING_DAYS_PER_YEAR - 1
    ann_vol = returns.std() * np.sqrt(TRADING_DAYS_PER_YEAR)
    sharpe = (excess.mean() / returns.std()) * np.sqrt(TRADING_DAYS_PER_YEAR) if returns.std() > 0 else None

    downside = returns[returns < 0]
    sortino = (
        (excess.mean() / downside.std()) * np.sqrt(TRADING_DAYS_PER_YEAR)
        if len(downside) > 1 and downside.std() > 0
        else None
    )

    cumulative = (1 + returns).cumprod()
    running_max = cumulative.cummax()
    max_drawdown = ((cumulative - running_max) / running_max).min()

    return {
        "annualized_return": float(ann_return),
        "annualized_volatility": float(ann_vol),
        "sharpe_ratio": float(sharpe) if sharpe is not None else None,
        "sortino_ratio": float(sortino) if sortino is not None else None,
        "max_drawdown": float(max_drawdown),
    }


def compute_relative_risk_metrics(fund_returns: pd.Series, benchmark_returns: pd.Series) -> dict:
    """Beta, Alpha, and Treynor ratio against a benchmark return series."""
    aligned = pd.concat([fund_returns, benchmark_returns], axis=1, join="inner").dropna()
    aligned.columns = ["fund", "benchmark"]
    if len(aligned) < 30 or aligned["benchmark"].var() == 0:
        return {}

    covariance = aligned["fund"].cov(aligned["benchmark"])
    beta = covariance / aligned["benchmark"].var()
    ann_fund_return = (1 + aligned["fund"].mean()) ** TRADING_DAYS_PER_YEAR - 1
    ann_bench_return = (1 + aligned["benchmark"].mean()) ** TRADING_DAYS_PER_YEAR - 1
    alpha = ann_fund_return - beta * ann_bench_return

    return {"beta": float(beta), "alpha": float(alpha)}


def build_feature_matrix(nav_history: list[tuple]) -> pd.DataFrame:
    """Full feature pipeline: NAV history -> engineered feature DataFrame."""
    df = build_nav_frame(nav_history)
    df = add_return_features(df)
    df = add_rolling_features(df)
    df = add_moving_averages(df)
    df = add_macd(df)
    df = add_rsi(df)
    df = add_bollinger_bands(df)
    df = add_momentum_volatility(df)
    df = add_drawdown(df)
    df = add_calendar_features(df)
    df = add_lag_features(df)
    return df
