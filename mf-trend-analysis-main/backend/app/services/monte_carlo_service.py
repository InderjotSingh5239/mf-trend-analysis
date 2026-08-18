"""
Monte Carlo simulation engine.

Simulates thousands of possible future paths for an investment (lumpsum +
optional monthly contributions) using Geometric Brownian Motion driven by
the fund's/portfolio's expected return and volatility. Used both by the
standalone "Monte Carlo Simulation" calculator and by Portfolio Analytics
("Future Projection").
"""

import numpy as np

from app.schemas.calculators import MonteCarloRequest, MonteCarloResponse


class MonteCarloService:
    @staticmethod
    def simulate(request: MonteCarloRequest, random_seed: int | None = None) -> MonteCarloResponse:
        rng = np.random.default_rng(random_seed)

        months = int(round(request.duration_years * 12))
        annual_return = request.expected_annual_return_percent / 100.0
        annual_vol = request.annual_volatility_percent / 100.0

        monthly_mean = annual_return / 12.0
        monthly_std = annual_vol / np.sqrt(12.0)

        num_sims = request.num_simulations

        # Simulate monthly log-returns for every path: shape (num_sims, months)
        monthly_returns = rng.normal(loc=monthly_mean, scale=monthly_std, size=(num_sims, months))

        values = np.full(num_sims, request.initial_investment, dtype=np.float64)
        for m in range(months):
            if request.monthly_contribution > 0:
                values = values + request.monthly_contribution
            values = values * (1.0 + monthly_returns[:, m])

        total_invested = request.initial_investment + request.monthly_contribution * months

        mean_final = float(np.mean(values))
        median_final = float(np.median(values))
        p5 = float(np.percentile(values, 5))
        p25 = float(np.percentile(values, 25))
        p75 = float(np.percentile(values, 75))
        p95 = float(np.percentile(values, 95))
        prob_loss = float(np.mean(values < total_invested))
        best_case = float(np.max(values))
        worst_case = float(np.min(values))

        return MonteCarloResponse(
            num_simulations=num_sims,
            duration_years=request.duration_years,
            mean_final_value=round(mean_final, 2),
            median_final_value=round(median_final, 2),
            percentile_5=round(p5, 2),
            percentile_25=round(p25, 2),
            percentile_75=round(p75, 2),
            percentile_95=round(p95, 2),
            probability_of_loss=round(prob_loss, 4),
            best_case=round(best_case, 2),
            worst_case=round(worst_case, 2),
        )
