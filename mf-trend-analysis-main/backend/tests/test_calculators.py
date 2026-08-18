import pytest

from app.schemas.calculators import (
    LumpsumProjectionRequest,
    RetirementProjectionRequest,
    SIPProjectionRequest,
)
from app.services.calculator_service import CalculatorService


class TestSIPProjection:
    def test_basic_sip_no_step_up(self):
        request = SIPProjectionRequest(
            monthly_investment=10000,
            expected_annual_return_percent=12,
            duration_years=10,
            step_up_percent=0,
        )
        result = CalculatorService.project_sip(request)

        assert result.total_invested == pytest.approx(1_200_000, rel=1e-6)
        # 10y @ 12% monthly SIP of 10k should roughly land ~23L (well-known industry approximation)
        assert result.maturity_value > result.total_invested
        assert result.estimated_returns == pytest.approx(result.maturity_value - result.total_invested)
        assert len(result.yearly_breakdown) == 10

    def test_sip_with_step_up_grows_faster_than_flat(self):
        flat = SIPProjectionRequest(
            monthly_investment=10000, expected_annual_return_percent=12, duration_years=10, step_up_percent=0
        )
        stepped = SIPProjectionRequest(
            monthly_investment=10000, expected_annual_return_percent=12, duration_years=10, step_up_percent=10
        )
        flat_result = CalculatorService.project_sip(flat)
        stepped_result = CalculatorService.project_sip(stepped)

        assert stepped_result.total_invested > flat_result.total_invested
        assert stepped_result.maturity_value > flat_result.maturity_value

    def test_sip_inflation_adjustment_reduces_value(self):
        request = SIPProjectionRequest(
            monthly_investment=5000,
            expected_annual_return_percent=10,
            duration_years=5,
            inflation_percent=6,
        )
        result = CalculatorService.project_sip(request)
        assert result.inflation_adjusted_value is not None
        assert result.inflation_adjusted_value < result.maturity_value


class TestLumpsumProjection:
    def test_basic_lumpsum(self):
        request = LumpsumProjectionRequest(
            principal=100000, expected_annual_return_percent=10, duration_years=5
        )
        result = CalculatorService.project_lumpsum(request)
        expected = 100000 * (1.10**5)
        assert result.maturity_value == pytest.approx(expected, rel=1e-6)
        assert result.estimated_returns == pytest.approx(expected - 100000, rel=1e-6)

    def test_fractional_duration(self):
        request = LumpsumProjectionRequest(
            principal=50000, expected_annual_return_percent=8, duration_years=2.5
        )
        result = CalculatorService.project_lumpsum(request)
        expected = 50000 * (1.08**2.5)
        assert result.maturity_value == pytest.approx(expected, rel=1e-4)


class TestRetirementProjection:
    def test_retirement_age_must_exceed_current_age(self):
        request = RetirementProjectionRequest(
            current_age=40,
            retirement_age=35,
            monthly_investment=10000,
            expected_annual_return_percent=10,
            post_retirement_annual_expense=600000,
        )
        with pytest.raises(ValueError):
            CalculatorService.project_retirement(request)

    def test_sufficient_corpus_flags_no_shortfall(self):
        request = RetirementProjectionRequest(
            current_age=30,
            retirement_age=60,
            current_savings=500000,
            monthly_investment=50000,
            expected_annual_return_percent=12,
            post_retirement_annual_expense=600000,
            inflation_percent=6,
            life_expectancy_age=85,
        )
        result = CalculatorService.project_retirement(request)
        assert result.years_to_retirement == 30
        assert result.corpus_at_retirement > 0
        assert result.corpus_sufficient is True
        assert result.monthly_investment_needed_if_shortfall is None

    def test_insufficient_corpus_suggests_higher_sip(self):
        request = RetirementProjectionRequest(
            current_age=55,
            retirement_age=60,
            current_savings=100000,
            monthly_investment=2000,
            expected_annual_return_percent=8,
            post_retirement_annual_expense=1000000,
            inflation_percent=6,
            life_expectancy_age=85,
        )
        result = CalculatorService.project_retirement(request)
        assert result.corpus_sufficient is False
        assert result.monthly_investment_needed_if_shortfall is not None
        assert result.monthly_investment_needed_if_shortfall > request.monthly_investment
