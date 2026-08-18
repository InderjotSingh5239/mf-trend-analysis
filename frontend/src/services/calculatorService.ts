import { apiClient } from '@/api/client'
import type {
  ApiSipResponse,
  ApiLumpsumResponse,
  ApiRetirementResponse,
  ApiMonteCarloResponse,
} from '@/types/api'

export interface SipCalculationInput {
  monthly_investment: number
  duration_years: number
  expected_annual_return_percent: number
  step_up_percent?: number
  inflation_percent?: number
}

export interface LumpsumCalculationInput {
  principal: number
  duration_years: number
  expected_annual_return_percent: number
  inflation_percent?: number
}

export interface RetirementCalculationInput {
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

export interface MonteCarloCalculationInput {
  initial_investment: number
  monthly_contribution?: number
  expected_annual_return_percent: number
  annual_volatility_percent: number
  duration_years: number
  num_simulations?: number
}

/**
 * SIP calculator
 * Uses the FastAPI backend only.
 */
export async function calculateSip(
  data: SipCalculationInput,
): Promise<ApiSipResponse> {
  const response = await apiClient.post<ApiSipResponse>(
    '/calculators/sip',
    {
      monthly_investment: data.monthly_investment,
      duration_years: data.duration_years,
      expected_annual_return_percent:
        data.expected_annual_return_percent,
      step_up_percent: data.step_up_percent ?? 0,
      inflation_percent: data.inflation_percent ?? 0,
    },
  )

  return response.data
}

/**
 * Lumpsum calculator
 * Uses the FastAPI backend only.
 */
export async function calculateLumpsum(
  data: LumpsumCalculationInput,
): Promise<ApiLumpsumResponse> {
  const response = await apiClient.post<ApiLumpsumResponse>(
    '/calculators/lumpsum',
    {
      principal: data.principal,
      duration_years: data.duration_years,
      expected_annual_return_percent:
        data.expected_annual_return_percent,
      inflation_percent: data.inflation_percent ?? 0,
    },
  )

  return response.data
}

/**
 * Retirement calculator
 * Uses the FastAPI backend only.
 */
export async function calculateRetirement(
  data: RetirementCalculationInput,
): Promise<ApiRetirementResponse> {
  const response =
    await apiClient.post<ApiRetirementResponse>(
      '/calculators/retirement',
      {
        current_age: data.current_age,
        retirement_age: data.retirement_age,
        current_savings: data.current_savings ?? 0,
        monthly_investment: data.monthly_investment,
        expected_annual_return_percent:
          data.expected_annual_return_percent,
        expected_annual_step_up_percent:
          data.expected_annual_step_up_percent ?? 0,
        post_retirement_annual_expense:
          data.post_retirement_annual_expense,
        inflation_percent: data.inflation_percent ?? 0,
        life_expectancy_age:
          data.life_expectancy_age ?? 85,
      },
    )

  return response.data
}

/**
 * Monte Carlo calculator
 * Uses the FastAPI backend only.
 */
export async function calculateMonteCarlo(
  data: MonteCarloCalculationInput,
): Promise<ApiMonteCarloResponse> {
  const response =
    await apiClient.post<ApiMonteCarloResponse>(
      '/calculators/monte-carlo',
      {
        initial_investment: data.initial_investment,
        monthly_contribution:
          data.monthly_contribution ?? 0,
        expected_annual_return_percent:
          data.expected_annual_return_percent,
        annual_volatility_percent:
          data.annual_volatility_percent,
        duration_years: data.duration_years,
        num_simulations:
          data.num_simulations ?? 1000,
      },
    )

  return response.data
}
