import uuid

import numpy as np
import pytest

from app.models.portfolio import Holding
from app.services.portfolio_analytics_service import AnalyticsService


def make_holding(units, nav, invested, category="large cap", sector="Financials"):
    return Holding(
        id=uuid.uuid4(),
        portfolio_id=uuid.uuid4(),
        fund_id=uuid.uuid4(),
        fund_name="Test Fund",
        sector=sector,
        category=category,
        units=units,
        avg_nav=invested / units if units else 0,
        invested_amount=invested,
        current_nav=nav,
    )


class TestDiversificationScore:
    def test_single_holding_is_zero_diversified(self):
        holdings = [make_holding(100, 50, 5000)]
        assert AnalyticsService.diversification_score(holdings) == 0.0

    def test_equal_weighted_holdings_score_high(self):
        holdings = [make_holding(100, 50, 5000) for _ in range(5)]
        score = AnalyticsService.diversification_score(holdings)
        assert score == pytest.approx(100.0, abs=0.5)

    def test_concentrated_portfolio_scores_lower_than_balanced(self):
        concentrated = [make_holding(1000, 50, 50000), make_holding(10, 50, 500)]
        balanced = [make_holding(100, 50, 5000), make_holding(100, 50, 5000)]
        assert AnalyticsService.diversification_score(concentrated) < AnalyticsService.diversification_score(
            balanced
        )


class TestRiskScore:
    def test_small_cap_heavy_portfolio_riskier_than_debt(self):
        small_cap = [make_holding(100, 50, 5000, category="small cap")]
        debt = [make_holding(100, 50, 5000, category="debt")]
        assert AnalyticsService.risk_score(small_cap) > AnalyticsService.risk_score(debt)

    def test_empty_portfolio_zero_risk(self):
        assert AnalyticsService.risk_score([]) == 0.0


class TestVolatilityAndRatios:
    def test_annualized_volatility_positive(self):
        rng = np.random.default_rng(1)
        daily_returns = list(rng.normal(0.0005, 0.01, 252))
        vol = AnalyticsService.annualized_volatility(daily_returns)
        assert vol > 0

    def test_sharpe_ratio_higher_for_higher_mean_return(self):
        # Use a fixed noise pattern and only vary the mean, with risk-free
        # rate zeroed out, so the comparison isolates the mean-return effect
        # instead of being swamped by random sampling noise.
        rng = np.random.default_rng(2)
        noise = rng.normal(0.0, 0.01, 252)
        low_return = list(noise + 0.0001)
        high_return = list(noise + 0.001)
        sharpe_low = AnalyticsService.sharpe_ratio(low_return, risk_free_rate_annual=0.0)
        sharpe_high = AnalyticsService.sharpe_ratio(high_return, risk_free_rate_annual=0.0)
        assert sharpe_high > sharpe_low

    def test_max_drawdown_detects_peak_to_trough(self):
        values = [100, 120, 90, 95, 130, 80, 110]
        dd = AnalyticsService.max_drawdown(values)
        # peak 130 -> trough 80 => -38.46%
        assert dd == pytest.approx(-38.46, abs=0.5)

    def test_beta_of_identical_series_is_one(self):
        rng = np.random.default_rng(3)
        returns = list(rng.normal(0.0005, 0.01, 100))
        beta = AnalyticsService.beta(returns, returns)
        assert beta == pytest.approx(1.0, abs=1e-6)
