import { apiClient } from '@/api/client'
import type { ApiFundRiskProfile } from '@/types/api'

export interface RiskProfile {
  benchmarkSymbol: string
  benchmarkDataAvailable: boolean
  annualizedReturn: number | null
  annualizedVolatility: number | null
  sharpeRatio: number | null
  sortinoRatio: number | null
  maxDrawdown: number | null
  beta: number | null
  alpha: number | null
}

function adaptRiskProfile(api: ApiFundRiskProfile): RiskProfile {
  return {
    benchmarkSymbol: api.benchmark_symbol,
    benchmarkDataAvailable: api.benchmark_data_available,
    annualizedReturn: api.annualized_return,
    annualizedVolatility: api.annualized_volatility,
    sharpeRatio: api.sharpe_ratio,
    sortinoRatio: api.sortino_ratio,
    maxDrawdown: api.max_drawdown,
    beta: api.beta,
    alpha: api.alpha,
  }
}

export async function fetchFundRiskProfile(fundId: string): Promise<RiskProfile> {
  const { data } = await apiClient.get<ApiFundRiskProfile>(`/market-data/funds/${fundId}/risk-profile`)
  return adaptRiskProfile(data)
}
