// =====================================================
// API Wire-Format Types
// Matches the FastAPI backend JSON/Pydantic schemas.
// =====================================================

// =====================================================
// Navigation / NAV History
// =====================================================

export interface ApiNavHistoryPoint {
  nav_date: string
  nav_value: number
}

// =====================================================
// Mutual Funds
// =====================================================

export interface ApiMutualFund {
  id: string
  scheme_code: string
  scheme_name: string

  amc_name: string | null
  category: string | null
  benchmark_index: string | null
  fund_manager: string | null

  expense_ratio: number | null
  aum_crore: number | null
  risk_category: string | null

  launch_date: string | null
  isin_growth: string | null
  exit_load: string | null
  min_investment: number | null

  latest_nav: number | null
  nav_change_percent: number | null
  cagr_3y: number | null
}

export interface ApiMutualFundDetail
  extends ApiMutualFund {
  nav_history: ApiNavHistoryPoint[]
}

export interface ApiMutualFundListResponse {
  total: number
  page: number
  page_size: number
  items: ApiMutualFund[]
}

export interface ApiTrendingFundsResponse {
  ranking_metric: string
  years: number
  items: ApiMutualFund[]
}

// =====================================================
// Fund Risk Profile
// =====================================================

export interface ApiFundRiskProfile {
  benchmark_symbol: string
  benchmark_data_available: boolean

  annualized_return: number | null
  annualized_volatility: number | null

  sharpe_ratio: number | null
  sortino_ratio: number | null
  max_drawdown: number | null

  beta: number | null
  alpha: number | null
}

// =====================================================
// Predictions
// =====================================================

export type ApiRecommendation =
  | 'BUY'
  | 'HOLD'
  | 'SELL'

export interface ApiPrediction {
  id: string

  horizon_days: number

  prediction_date: string
  target_date: string

  predicted_nav: number
  expected_return_pct: number

  confidence_score: number
  risk_score: number

  lower_bound: number | null
  upper_bound: number | null

  recommendation: ApiRecommendation

  explanation: string | null

  created_at: string
}

export interface ApiHistoricalNAV {
  date: string
  nav: number
}

export interface ApiPredictionListResponse {
  fund_id: string
  historical_nav: ApiHistoricalNAV[]
  predictions: ApiPrediction[]
}

// =====================================================
// ML Models
// =====================================================

export interface ApiModelMetric {
  mae: number | null
  mse: number | null
  rmse: number | null
  mape: number | null

  r2: number | null
  adjusted_r2: number | null

  rank: number | null
}

export interface ApiMLModel {
  id: string

  model_name: string
  version: number

  is_best: boolean
  status: string

  created_at: string

  metrics: ApiModelMetric[]
}

// =====================================================
// Market Data
// =====================================================

export interface ApiMarketDataPoint {
  symbol: string
  name: string
  category: string

  data_date: string
  close_value: number
}

export interface ApiMarketDataSeriesResponse {
  symbol: string
  points: ApiMarketDataPoint[]
}

// =====================================================
// News
// =====================================================

export interface ApiNews {
  id: string

  title: string
  url: string

  source: string | null
  published_at: string

  summary: string | null
  category: string | null

  sentiment_label: string | null
  sentiment_score: number | null

  impact_score: number | null
}

// =====================================================
// Portfolio
// =====================================================

export interface ApiPortfolio {
  id: string
  user_id: string

  name: string
  description: string | null

  base_currency: string

  created_at: string
  updated_at: string
}

export interface ApiHolding {
  id: string

  portfolio_id: string
  fund_id: string
  fund_name: string

  sector: string | null
  category: string | null

  units: number
  avg_nav: number

  invested_amount: number
  current_nav: number
  current_value: number
  pnl: number
  pnl_percent: number
}

export type ApiTransactionType =
  | 'BUY'
  | 'SELL'
  | 'SIP'
  | 'DIVIDEND_REINVEST'
  | 'SWITCH_IN'
  | 'SWITCH_OUT'

export interface ApiTransaction {
  id: string

  portfolio_id: string
  fund_id: string
  fund_name: string

  transaction_type: ApiTransactionType

  units: number
  nav: number
  amount: number

  transaction_date: string
}

export interface ApiPortfolioSummary {
  portfolio_id: string
  total_invested: number
  current_value: number
  total_pnl: number
  total_pnl_percent: number
  xirr: number | null
  number_of_holdings: number
  diversification_score: number
  risk_score: number
  volatility: number
  sharpe_ratio: number | null
  sector_allocation: Record<string, number>
  category_allocation: Record<string, number>
  top_holdings: ApiHolding[]
}

// =====================================================
// Watchlist
// =====================================================

export interface ApiWatchlist {
  id: string
  user_id: string

  name: string

  created_at: string
  items?: ApiWatchlistItem[]
}

export interface ApiWatchlistItem {
  id: string

  watchlist_id: string
  fund_id: string
  fund_name: string

  notes: string | null
  added_at: string
}

// =====================================================
// Alerts
// =====================================================

export type ApiAlertType =
  | 'NAV_ABOVE'
  | 'NAV_BELOW'
  | 'RETURN_ABOVE'
  | 'RETURN_BELOW'
  | 'RISK_SCORE_ABOVE'
  | 'PORTFOLIO_DRAWDOWN'

export type ApiAlertStatus =
  | 'ACTIVE'
  | 'TRIGGERED'
  | 'DISABLED'

export interface ApiAlert {
  id: string

  user_id: string

  fund_id: string | null
  portfolio_id: string | null

  alert_type: ApiAlertType

  threshold_value: number

  status: ApiAlertStatus

  is_recurring: boolean

  created_at: string
  triggered_at: string | null
}

// =====================================================
// Calculator - Shared
// =====================================================

export interface ApiYearlyBreakdown {
  year: number
  invested: number
  returns: number
  value: number
}

// =====================================================
// SIP Calculator
// =====================================================

export interface ApiSipRequest {
  monthly_investment: number

  expected_annual_return_percent: number

  duration_years: number

  step_up_percent?: number

  inflation_percent?: number
}

export interface ApiSipResponse {
  total_invested: number

  maturity_value: number

  estimated_returns: number

  inflation_adjusted_value: number | null

  yearly_breakdown: ApiYearlyBreakdown[]
}

// =====================================================
// Lumpsum Calculator
// =====================================================

export interface ApiLumpsumRequest {
  principal: number

  expected_annual_return_percent: number

  duration_years: number

  inflation_percent?: number
}

export interface ApiLumpsumResponse {
  principal: number

  maturity_value: number

  estimated_returns: number

  inflation_adjusted_value: number | null

  yearly_breakdown: ApiYearlyBreakdown[]
}

// =====================================================
// Retirement Calculator
// =====================================================

export interface ApiRetirementRequest {
  current_age: number

  retirement_age: number

  current_savings?: number

  monthly_investment: number

  expected_annual_return_percent: number

  expected_annual_step_up_percent?: number

  post_retirement_annual_expense: number

  inflation_percent?: number

  life_expectancy_age?: number
}

export interface ApiRetirementResponse {
  years_to_retirement: number

  corpus_at_retirement: number

  required_corpus_at_retirement: number

  corpus_sufficient: boolean

  shortfall_or_surplus: number

  monthly_investment_needed_if_shortfall: number | null
}

// =====================================================
// Monte Carlo Calculator
// =====================================================

export interface ApiMonteCarloRequest {
  initial_investment: number

  monthly_contribution?: number

  expected_annual_return_percent: number

  annual_volatility_percent: number

  duration_years: number

  num_simulations?: number
}

export interface ApiMonteCarloResponse {
  num_simulations: number

  duration_years: number

  mean_final_value: number

  median_final_value: number

  percentile_5: number
  percentile_25: number

  percentile_75: number
  percentile_95: number

  probability_of_loss: number

  best_case: number
  worst_case: number
}
