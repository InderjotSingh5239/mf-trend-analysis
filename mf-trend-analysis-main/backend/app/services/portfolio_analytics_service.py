"""
Portfolio analytics: diversification score, risk score, sector/category
allocation, volatility, Sharpe ratio, benchmark comparison.

Diversification score (0-100): based on the Herfindahl-Hirschman Index (HHI)
of holding weights and sector weights — lower concentration => higher score.

Risk score (0-100, higher = riskier): weighted blend of portfolio volatility
(annualized) and category risk weights, so a portfolio with a few small-cap
heavy holdings scores higher than a diversified large-cap/debt mix.
"""

import numpy as np

from app.core.config import settings
from app.models.portfolio import Holding

# Coarse risk weighting by category, used when a fund's own volatility
# history isn't available. Values are illustrative industry norms (0-100).
CATEGORY_RISK_WEIGHTS: dict[str, float] = {
    "liquid": 5,
    "overnight": 5,
    "debt": 20,
    "hybrid": 45,
    "large cap": 55,
    "flexi cap": 60,
    "multi cap": 62,
    "mid cap": 75,
    "small cap": 90,
    "sectoral": 88,
    "thematic": 88,
    "index": 55,
    "elss": 60,
}
DEFAULT_CATEGORY_RISK = 60.0


class AnalyticsService:
    @staticmethod
    def sector_allocation(holdings: list[Holding]) -> dict[str, float]:
        return AnalyticsService._allocation_by(holdings, key="sector")

    @staticmethod
    def category_allocation(holdings: list[Holding]) -> dict[str, float]:
        return AnalyticsService._allocation_by(holdings, key="category")

    @staticmethod
    def _allocation_by(holdings: list[Holding], key: str) -> dict[str, float]:
        total_value = sum(h.current_value for h in holdings)
        if total_value <= 0:
            return {}
        buckets: dict[str, float] = {}
        for h in holdings:
            label = getattr(h, key, None) or "Uncategorized"
            buckets[label] = buckets.get(label, 0.0) + h.current_value
        return {k: round((v / total_value) * 100, 2) for k, v in buckets.items()}

    @staticmethod
    def diversification_score(holdings: list[Holding]) -> float:
        """
        HHI-based diversification score.
        HHI ranges from 1/n (perfectly diversified) to 1 (single holding).
        Score = 100 * (1 - normalized_HHI), clipped to [0, 100].
        """
        total_value = sum(h.current_value for h in holdings)
        n = len(holdings)
        if total_value <= 0 or n == 0:
            return 0.0
        if n == 1:
            return 0.0

        weights = np.array([h.current_value / total_value for h in holdings])
        hhi = float(np.sum(weights**2))
        hhi_min = 1.0 / n  # perfectly equal-weighted
        # normalize so hhi_min -> score 100, hhi=1 -> score 0
        normalized = (hhi - hhi_min) / (1.0 - hhi_min) if hhi_min < 1.0 else 0.0
        score = 100.0 * (1.0 - normalized)
        return round(float(np.clip(score, 0.0, 100.0)), 2)

    @staticmethod
    def risk_score(holdings: list[Holding], portfolio_volatility_percent: float | None = None) -> float:
        """
        Weighted average of category-based risk weights, optionally blended
        with realized portfolio volatility if daily NAV history was supplied.
        """
        total_value = sum(h.current_value for h in holdings)
        if total_value <= 0:
            return 0.0

        weighted_risk = 0.0
        for h in holdings:
            category_key = (h.category or "").strip().lower()
            risk_weight = CATEGORY_RISK_WEIGHTS.get(category_key, DEFAULT_CATEGORY_RISK)
            weighted_risk += (h.current_value / total_value) * risk_weight

        if portfolio_volatility_percent is not None:
            # Blend 60% category-based, 40% realized volatility (capped at 100).
            vol_component = min(portfolio_volatility_percent * 2.5, 100.0)  # scale annualized vol to 0-100
            weighted_risk = 0.6 * weighted_risk + 0.4 * vol_component

        return round(float(np.clip(weighted_risk, 0.0, 100.0)), 2)

    @staticmethod
    def annualized_volatility(daily_returns: list[float]) -> float:
        """Annualized volatility (%) from a series of daily fractional returns."""
        if not daily_returns or len(daily_returns) < 2:
            return 0.0
        std_daily = float(np.std(daily_returns, ddof=1))
        annualized = std_daily * np.sqrt(settings.DEFAULT_TRADING_DAYS_PER_YEAR)
        return round(annualized * 100, 4)

    @staticmethod
    def sharpe_ratio(
        daily_returns: list[float],
        risk_free_rate_annual: float | None = None,
    ) -> float | None:
        """Annualized Sharpe ratio from daily fractional returns."""
        if not daily_returns or len(daily_returns) < 2:
            return None
        rf = risk_free_rate_annual if risk_free_rate_annual is not None else settings.DEFAULT_RISK_FREE_RATE
        rf_daily = rf / settings.DEFAULT_TRADING_DAYS_PER_YEAR

        excess_returns = np.array(daily_returns) - rf_daily
        mean_excess = float(np.mean(excess_returns))
        std_excess = float(np.std(excess_returns, ddof=1))
        if std_excess == 0:
            return None
        daily_sharpe = mean_excess / std_excess
        annualized_sharpe = daily_sharpe * np.sqrt(settings.DEFAULT_TRADING_DAYS_PER_YEAR)
        return round(float(annualized_sharpe), 4)

    @staticmethod
    def sortino_ratio(
        daily_returns: list[float],
        risk_free_rate_annual: float | None = None,
    ) -> float | None:
        if not daily_returns or len(daily_returns) < 2:
            return None
        rf = risk_free_rate_annual if risk_free_rate_annual is not None else settings.DEFAULT_RISK_FREE_RATE
        rf_daily = rf / settings.DEFAULT_TRADING_DAYS_PER_YEAR

        returns = np.array(daily_returns)
        excess_returns = returns - rf_daily
        downside_returns = excess_returns[excess_returns < 0]
        if len(downside_returns) == 0:
            return None
        downside_std = float(np.std(downside_returns, ddof=1))
        if downside_std == 0:
            return None
        mean_excess = float(np.mean(excess_returns))
        daily_sortino = mean_excess / downside_std
        return round(float(daily_sortino * np.sqrt(settings.DEFAULT_TRADING_DAYS_PER_YEAR)), 4)

    @staticmethod
    def max_drawdown(cumulative_values: list[float]) -> float:
        """Maximum drawdown (%) from a series of cumulative portfolio/fund values."""
        if not cumulative_values or len(cumulative_values) < 2:
            return 0.0
        values = np.array(cumulative_values, dtype=np.float64)
        running_max = np.maximum.accumulate(values)
        drawdowns = (values - running_max) / running_max
        return round(float(np.min(drawdowns)) * 100, 4)

    @staticmethod
    def beta(portfolio_returns: list[float], benchmark_returns: list[float]) -> float | None:
        """Beta of portfolio relative to a benchmark index, from aligned daily returns."""
        if len(portfolio_returns) != len(benchmark_returns) or len(portfolio_returns) < 2:
            return None
        p = np.array(portfolio_returns)
        b = np.array(benchmark_returns)
        covariance = np.cov(p, b)[0][1]
        benchmark_variance = np.var(b, ddof=1)
        if benchmark_variance == 0:
            return None
        return round(float(covariance / benchmark_variance), 4)

    @staticmethod
    def benchmark_comparison(portfolio_return_percent: float, benchmark_return_percent: float) -> dict:
        alpha = portfolio_return_percent - benchmark_return_percent
        return {
            "portfolio_return_percent": round(portfolio_return_percent, 4),
            "benchmark_return_percent": round(benchmark_return_percent, 4),
            "alpha_percent": round(alpha, 4),
            "outperforming": alpha > 0,
        }
