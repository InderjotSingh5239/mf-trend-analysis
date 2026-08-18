"""
Deterministic financial calculators: SIP projection, Lumpsum projection,
Retirement projection. Pure math, no DB dependency, fully unit-testable.
"""

import math

from app.schemas.calculators import (
    LumpsumProjectionRequest,
    LumpsumProjectionResponse,
    RetirementProjectionRequest,
    RetirementProjectionResponse,
    SIPProjectionRequest,
    SIPProjectionResponse,
)


class CalculatorService:
    # ---------------- SIP ----------------
    @staticmethod
    def project_sip(request: SIPProjectionRequest) -> SIPProjectionResponse:
        monthly_rate = request.expected_annual_return_percent / 100.0 / 12.0
        total_months = int(round(request.duration_years * 12))

        current_monthly_investment = request.monthly_investment
        total_invested = 0.0
        corpus = 0.0
        yearly_breakdown = []

        month_counter = 0
        for year in range(1, math.ceil(request.duration_years) + 1):
            months_this_year = min(12, total_months - month_counter)
            if months_this_year <= 0:
                break
            for _ in range(months_this_year):
                # Annuity-due: each month's investment is added first, then the
                # whole balance compounds for that month — this matches the
                # industry-standard convention used by Indian SIP calculators
                # (Groww, ET Money, etc.), where a SIP instalment starts earning
                # returns from the month it's invested in.
                corpus = (corpus + current_monthly_investment) * (1 + monthly_rate)
                total_invested += current_monthly_investment
                month_counter += 1

            yearly_breakdown.append({
                "year": year,
                "monthly_sip": round(current_monthly_investment, 2),
                "invested": round(total_invested, 2),
                "returns": round(corpus - total_invested, 2),
                "value": round(corpus, 2),
                    })
            # Apply step-up for next year
            current_monthly_investment *= 1 + (request.step_up_percent / 100.0)

        total_invested = round(total_invested,2)
        corpus = round(corpus,2)
        estimated_returns = round(corpus-total_invested,2)

        inflation_adjusted_value = None
        if request.inflation_percent > 0:
            inflation_adjusted_value = corpus / (
                (1 + request.inflation_percent / 100.0) ** request.duration_years
            )

        return SIPProjectionResponse(
            total_invested=total_invested,
            maturity_value=corpus,
            estimated_returns=estimated_returns,
            inflation_adjusted_value=round(inflation_adjusted_value, 2) 
        if inflation_adjusted_value 
            else None,
            yearly_breakdown=yearly_breakdown,
        )

    # ---------------- Lumpsum ----------------
    @staticmethod
    def project_lumpsum(request: LumpsumProjectionRequest) -> LumpsumProjectionResponse:
        annual_rate = request.expected_annual_return_percent / 100.0
        monthly_rate = (1 + annual_rate) ** (1 / 12) - 1
        
        yearly_breakdown = []
        value = request.principal

        full_years = math.floor(request.duration_years)
        for year in range(1, full_years + 1):
            value = request.principal * ((1 + monthly_rate) ** (year * 12))
            yearly_breakdown.append({"year": year, "invested": request.principal, "returns": round(value - request.principal, 2), "value": round(value,2)
                                    })

        remainder = request.duration_years - full_years

        if remainder > 0:
            total_months = int(round(request.duration_years * 12))
            value = request.principal * ((1 + monthly_rate) ** total_months)
           
            yearly_breakdown.append({
                "year": round(request.duration_years, 2),
                "invested": request.principal,
                "returns": round(value - request.principal, 2),
                "value": round(value, 2),
            })
        estimated_returns = value - request.principal

        inflation_adjusted_value = None
        if request.inflation_percent > 0:
            inflation_adjusted_value = round(value /((1 + request.inflation_percent / 100) ** request.duration_years), 2,
            )

        return LumpsumProjectionResponse(
            principal=request.principal,
            maturity_value=round(value, 2),
            estimated_returns=round(estimated_returns, 2),
            inflation_adjusted_value=inflation_adjusted_value if inflation_adjusted_value else None,
            yearly_breakdown=yearly_breakdown,
        )

    # ---------------- Retirement ----------------
    @staticmethod
    def project_retirement(request: RetirementProjectionRequest) -> RetirementProjectionResponse:
        years_to_retirement = request.retirement_age - request.current_age
        if years_to_retirement <= 0:
            raise ValueError("retirement_age must be greater than current_age")

        monthly_rate = request.expected_annual_return_percent / 100.0 / 12.0
        months_to_retirement = years_to_retirement * 12

        corpus = request.current_savings
        monthly_investment = request.monthly_investment
        month_counter = 0

        for year in range(years_to_retirement):
            months_this_year = min(12, months_to_retirement - month_counter)
            for _ in range(months_this_year):
                corpus = (corpus + monthly_investment) * (1 + monthly_rate)
                month_counter += 1
            monthly_investment *= 1 + (request.expected_annual_step_up_percent / 100.0)

        # Required corpus: enough to fund inflation-adjusted expenses from retirement
        # to life expectancy, modeled as a real (inflation-adjusted) annuity.
        retirement_years = request.life_expectancy_age - request.retirement_age
        real_return = (
            (1 + request.expected_annual_return_percent / 100.0) / (1 + request.inflation_percent / 100.0)
        ) - 1

        # First year expense inflated to the retirement date
        first_year_expense = request.post_retirement_annual_expense * (
            (1 + request.inflation_percent / 100.0) ** years_to_retirement
        )

        if abs(real_return) < 1e-9:
            required_corpus = first_year_expense * retirement_years
        else:
            required_corpus = first_year_expense * (
                (1 - (1 + real_return) ** (-retirement_years)) / real_return
            )

        shortfall_or_surplus = corpus - required_corpus
        corpus_sufficient = shortfall_or_surplus >= 0

        monthly_investment_needed = None
        if not corpus_sufficient:
            # Solve for the level monthly SIP (no step-up) needed to close the gap,
            # using future value of annuity formula.
            if monthly_rate > 0:
                factor = (((1 + monthly_rate) ** months_to_retirement - 1) / monthly_rate) * (
                    1 + monthly_rate
                )
            else:
                factor = months_to_retirement
            additional_needed = abs(shortfall_or_surplus)
            monthly_investment_needed = round(additional_needed / factor + request.monthly_investment, 2)

        return RetirementProjectionResponse(
            years_to_retirement=years_to_retirement,
            corpus_at_retirement=round(corpus, 2),
            required_corpus_at_retirement=round(required_corpus, 2),
            corpus_sufficient=corpus_sufficient,
            shortfall_or_surplus=round(shortfall_or_surplus, 2),
            monthly_investment_needed_if_shortfall=monthly_investment_needed,
        )
