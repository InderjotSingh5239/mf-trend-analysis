import { apiClient } from '@/api/client'
import type { ApiRetirementResponse, ApiMonteCarloResponse, ApiSipResponse, ApiLumpsumResponse } from '@/types/api'

export async function calculateSip(data: {
  monthly_investment: number
  duration_years: number
  expected_annual_return_percent: number
  step_up_percent?: number
  inflation_percent?: number
}): Promise<ApiSipResponse> {
  const res = await apiClient.post<ApiSipResponse>('/calculators/sip', data)
  return res.data
}

export async function calculateLumpsum(data: {
  principal: number
  duration_years: number
  expected_annual_return_percent: number
  inflation_percent?: number
}): Promise<ApiLumpsumResponse> {
  const res = await apiClient.post<ApiLumpsumResponse>('/calculators/lumpsum', data)
  return res.data
}

export async function calculateRetirement(data: {
  current_age: number
  retirement_age: number
  current_savings?: number
  monthly_investment: number
  expected_annual_return_percent: number
  expected_annual_step_up_percent?: number
  post_retirement_annual_expense: number
  inflation_percent?: number
  life_expectancy_age?: number
}): Promise<ApiRetirementResponse> {
  const res = await apiClient.post<ApiRetirementResponse>('/calculators/retirement', data)
  return res.data
}

export async function calculateMonteCarlo(data: {
  initial_investment: number
  monthly_contribution?: number
  expected_annual_return_percent: number
  annual_volatility_percent: number
  duration_years: number
  num_simulations?: number
}): Promise<ApiMonteCarloResponse> {
  const res = await apiClient.post<ApiMonteCarloResponse>('/calculators/monte-carlo', data)
  return res.data
}
