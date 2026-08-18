from pydantic import BaseModel, Field


class SIPProjectionRequest(BaseModel):
    monthly_investment: float = Field(..., gt=0)
    expected_annual_return_percent: float = Field(..., description="e.g. 12 for 12%")
    duration_years: float = Field(..., gt=0)
    step_up_percent: float = Field(
        default=0.0, ge=0, description="Annual step-up in SIP amount, e.g. 10 for 10%"
    )
    inflation_percent: float = Field(default=0.0, ge=0)


class SIPProjectionResponse(BaseModel):
    total_invested: float
    maturity_value: float
    estimated_returns: float
    inflation_adjusted_value: float | None = None
    yearly_breakdown: list[dict]


class LumpsumProjectionRequest(BaseModel):
    principal: float = Field(..., gt=0)
    expected_annual_return_percent: float
    duration_years: float = Field(..., gt=0)
    inflation_percent: float = Field(default=0.0, ge=0)


class LumpsumProjectionResponse(BaseModel):
    principal: float
    maturity_value: float
    estimated_returns: float
    inflation_adjusted_value: float | None = None
    yearly_breakdown: list[dict]


class RetirementProjectionRequest(BaseModel):
    current_age: int = Field(..., ge=18, le=80)
    retirement_age: int = Field(..., ge=19, le=90)
    current_savings: float = Field(default=0.0, ge=0)
    monthly_investment: float = Field(..., gt=0)
    expected_annual_return_percent: float
    expected_annual_step_up_percent: float = Field(default=0.0, ge=0)
    post_retirement_annual_expense: float = Field(..., gt=0)
    inflation_percent: float = Field(default=6.0, ge=0)
    life_expectancy_age: int = Field(default=85, ge=60, le=110)


class RetirementProjectionResponse(BaseModel):
    years_to_retirement: int
    corpus_at_retirement: float
    required_corpus_at_retirement: float
    corpus_sufficient: bool
    shortfall_or_surplus: float
    monthly_investment_needed_if_shortfall: float | None = None


class MonteCarloRequest(BaseModel):
    initial_investment: float = Field(..., gt=0)
    monthly_contribution: float = Field(default=0.0, ge=0)
    expected_annual_return_percent: float
    annual_volatility_percent: float = Field(..., gt=0)
    duration_years: float = Field(..., gt=0)
    num_simulations: int = Field(default=5000, ge=100, le=50000)


class MonteCarloResponse(BaseModel):
    num_simulations: int
    duration_years: float
    mean_final_value: float
    median_final_value: float
    percentile_5: float
    percentile_25: float
    percentile_75: float
    percentile_95: float
    probability_of_loss: float
    best_case: float
    worst_case: float
