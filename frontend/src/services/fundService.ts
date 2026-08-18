import type {
  MutualFund,
  FundCategory,
  AMC,
  RiskLevel,
} from '@/types/fund'

import type {
  ApiMutualFund,
  ApiMutualFundDetail,
  ApiFundRiskProfile,
  ApiTrendingFundsResponse,
} from '@/types/api'

import { apiClient } from '@/api/client'
import {
  adaptApiFund,
  adaptApiFundDetail,
} from '@/services/fundAdapter'

export interface FundFilters {
  search?: string
  category?: FundCategory | 'All'
  amc?: AMC | 'All'
  riskLevel?: RiskLevel | 'All'
  maxExpenseRatio?: number
  sortBy?: 'nav' | 'navChangePercent' | 'cagr3y' | 'aum' | 'rating' | 'expenseRatio'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface PaginatedFunds {
  funds: MutualFund[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface ApiFundListResponse {
  items: ApiMutualFund[]
  total: number
  page: number
  page_size: number
}

/**
 * Fetch real mutual-fund data from FastAPI.
 *
 * No mock-data fallback is used here.
 */
export async function fetchFunds(
  filters: FundFilters = {},
): Promise<PaginatedFunds> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20

  const response =
    await apiClient.get<ApiFundListResponse>(
      '/funds',
      {
        params: {
          page,
          page_size: pageSize,
          search:
            filters.search?.trim() || undefined,
          category:
            filters.category &&
            filters.category !== 'All'
              ? filters.category
              : undefined,
          amc:
            filters.amc &&
            filters.amc !== 'All'
              ? filters.amc
              : undefined,
          risk_level:
            filters.riskLevel &&
            filters.riskLevel !== 'All'
              ? filters.riskLevel
              : undefined,
          max_expense_ratio:
            filters.maxExpenseRatio,
          sort_by:
            filters.sortBy === 'expenseRatio'
              ? 'expense_ratio'
              : filters.sortBy === 'navChangePercent'
                ? 'nav_change_percent'
                : filters.sortBy ?? 'scheme_name',
          sort_order:
            filters.sortOrder ?? 'asc',
        },
      },
    )

  const data = response.data

  let funds = data.items.map(
    (fund) => adaptApiFund(fund),
  )

  return {
    funds,
    total: data.total,
    page: data.page,
    pageSize: data.page_size,
    totalPages: Math.max(
      1,
      Math.ceil(
        data.total / data.page_size,
      ),
    ),
  }
}

/**
 * Fetch one fund with its complete real
 * backend detail response.
 */
export async function fetchFundById(
  id: string,
): Promise<MutualFund | undefined> {
  if (!id) {
    return undefined
  }

  const [fundResponse, riskResponse] =
    await Promise.allSettled([
      apiClient.get<ApiMutualFundDetail>(
        `/funds/${encodeURIComponent(id)}`,
      ),
      apiClient.get<ApiFundRiskProfile>(
        `/market-data/funds/${encodeURIComponent(id)}/risk-profile`,
      ),
    ])

  if (fundResponse.status === 'rejected') {
    throw fundResponse.reason
  }

  const fund = adaptApiFundDetail(
    fundResponse.value.data,
  )

  if (riskResponse.status === 'fulfilled') {
    const risk = riskResponse.value.data
    fund.riskMetrics = {
      alpha: risk.alpha ?? 0,
      beta: risk.beta ?? 0,
      sharpeRatio: risk.sharpe_ratio ?? 0,
      standardDeviation:
        (risk.annualized_volatility ?? 0) * 100,
      sortino: risk.sortino_ratio ?? 0,
    }
  }

  return fund
}

/**
 * Fetch top gaining funds using real API data.
 */
export async function fetchTopGainers(
  limit = 5,
): Promise<MutualFund[]> {
  const { funds } = await fetchFunds({
    page: 1,
    pageSize: limit,
    sortBy: 'navChangePercent',
    sortOrder: 'desc',
  })

  return funds.filter(
    (fund) =>
      typeof fund.navChangePercent === 'number' &&
      Number.isFinite(fund.navChangePercent),
  ).slice(0, limit)
}

/**
 * Fetch top losing funds using real API data.
 */
export async function fetchTopLosers(
  limit = 5,
): Promise<MutualFund[]> {
  const { funds } = await fetchFunds({
    page: 1,
    pageSize: limit,
    sortBy: 'navChangePercent',
    sortOrder: 'asc',
  })

  return funds.filter(
    (fund) =>
      typeof fund.navChangePercent === 'number' &&
      Number.isFinite(fund.navChangePercent),
  ).slice(0, limit)
}

/**
 * Fetch trending funds from the real backend `/funds/trending` endpoint,
 * which ranks by actual trailing 3-year CAGR computed from stored NAV
 * history (see backend `FundRepository.get_trailing_cagr_map`).
 *
 * This is intentionally a different metric/endpoint from top gainers/
 * losers (single-day NAV change) — see PROJECT_AUDIT.md item D. Funds
 * without ~3 years of NAV history are omitted by the backend rather
 * than assigned a fabricated CAGR.
 */
export async function fetchTrendingFunds(
  limit = 6,
): Promise<MutualFund[]> {
  const response = await apiClient.get<ApiTrendingFundsResponse>(
    '/funds/trending',
    { params: { limit } },
  )

  return response.data.items.map((fund) => adaptApiFund(fund))
}
