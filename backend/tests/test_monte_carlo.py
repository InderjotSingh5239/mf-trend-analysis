from app.schemas.calculators import MonteCarloRequest
from app.services.monte_carlo_service import MonteCarloService


class TestMonteCarloService:
    def test_simulation_returns_consistent_shape(self):
        request = MonteCarloRequest(
            initial_investment=100000,
            monthly_contribution=5000,
            expected_annual_return_percent=12,
            annual_volatility_percent=15,
            duration_years=10,
            num_simulations=1000,
        )
        result = MonteCarloService.simulate(request, random_seed=42)

        assert result.num_simulations == 1000
        assert result.percentile_5 <= result.percentile_25 <= result.median_final_value
        assert result.median_final_value <= result.percentile_75 <= result.percentile_95
        assert result.worst_case <= result.percentile_5
        assert result.best_case >= result.percentile_95
        assert 0.0 <= result.probability_of_loss <= 1.0

    def test_higher_volatility_widens_distribution(self):
        base_kwargs = dict(
            initial_investment=100000,
            monthly_contribution=0,
            expected_annual_return_percent=10,
            duration_years=15,
            num_simulations=2000,
        )
        low_vol = MonteCarloService.simulate(
            MonteCarloRequest(annual_volatility_percent=8, **base_kwargs), random_seed=1
        )
        high_vol = MonteCarloService.simulate(
            MonteCarloRequest(annual_volatility_percent=25, **base_kwargs), random_seed=1
        )

        low_spread = low_vol.percentile_95 - low_vol.percentile_5
        high_spread = high_vol.percentile_95 - high_vol.percentile_5
        assert high_spread > low_spread

    def test_zero_contribution_only_grows_from_initial(self):
        request = MonteCarloRequest(
            initial_investment=50000,
            monthly_contribution=0,
            expected_annual_return_percent=0,
            annual_volatility_percent=0.01,
            duration_years=1,
            num_simulations=500,
        )
        result = MonteCarloService.simulate(request, random_seed=7)
        # With ~0% return and negligible volatility, final value should be close to initial investment.
        assert abs(result.mean_final_value - 50000) < 2000
