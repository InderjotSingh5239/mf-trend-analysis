import type { MutualFund, FundCategory, AMC, RiskLevel } from '@/types/fund'
import type {
  ApiMutualFundDetail,
  ApiMutualFundListResponse,
} from '@/types/api'

import { apiClient } from '@/api/client'
import { adaptApiFund, adaptApiFundDetail } from '@/services/fundAdapter'

export interface FundFilters {
  search?: string
  category?: FundCategory | 'All'
  amc?: AMC | 'All'
  riskLevel?: RiskLevel | 'All'
  maxExpenseRatio?: number
  sortBy?: 'nav' | 'cagr3y' | 'aum' | 'rating' | 'expenseRatio'
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

async function fetchFundsFromApi(
  filters: FundFilters = {},
): Promise<PaginatedFunds> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(
    100,
    Math.max(1, filters.pageSize ?? 30),
  )

  const params: Record<string, string | number> = {
    page,
    page_size: pageSize,
  }

  if (filters.search?.trim()) {
    params.search = filters.search.trim()
  }

  /*
   * These parameters are sent only when selected.
   * If the backend supports them, filtering is performed server-side.
   */
  if (filters.category && filters.category !== 'All') {
    params.category = filters.category
  }

  if (filters.amc && filters.amc !== 'All') {
    params.amc = filters.amc
  }

  if (filters.riskLevel && filters.riskLevel !== 'All') {
    params.risk_level = filters.riskLevel
  }

  if (filters.maxExpenseRatio !== undefined) {
    params.max_expense_ratio = filters.maxExpenseRatio
  }

  if (filters.sortBy) {
    params.sort_by = filters.sortBy
  }

  if (filters.sortOrder) {
    params.sort_order = filters.sortOrder
  }

  const { data } =
    await apiClient.get<ApiMutualFundListResponse>(
      '/funds',
      { params },
    )

  const funds = data.items.map(adaptApiFund)

  const total = Number.isFinite(data.total)
    ? data.total
    : funds.length

  const returnedPage = Number.isFinite(data.page)
    ? data.page
    : page

  const returnedPageSize =
    Number.isFinite(data.page_size) && data.page_size > 0
      ? data.page_size
      : pageSize

  return {
    funds,
    total,
    page: returnedPage,
    pageSize: returnedPageSize,
    totalPages: Math.max(
      1,
      Math.ceil(total / returnedPageSize),
    ),
  }
}

/**
 * Fetch mutual funds from the FastAPI backend.
 */
export async function fetchFunds(
  filters: FundFilters = {},
): Promise<PaginatedFunds> {
  return fetchFundsFromApi(filters)
}

/**
 * Fetch one complete mutual-fund record.
 */
export async function fetchFundById(
  id: string,
): Promise<MutualFund | undefined> {
  if (!id?.trim()) {
    return undefined
  }

  try {
    const { data } =
      await apiClient.get<ApiMutualFundDetail>(
        `/funds/${encodeURIComponent(id)}`,
      )

    return adaptApiFundDetail(data)
  } catch {
    return undefined
  }
}

/**
 * Fetch top gainers using real NAV day-change data.
 */
export async function fetchTopGainers(
  limit = 5,
): Promise<MutualFund[]> {
  const safeLimit = Math.max(1, Math.min(limit, 20))

  const { funds } = await fetchFundsFromApi({
    page: 1,
    pageSize: 100,
  })

  return [...funds]
    .filter(
      (fund) =>
        typeof fund.navChangePercent === 'number' &&
        Number.isFinite(fund.navChangePercent),
    )
    .sort(
      (a, b) =>
        (b.navChangePercent ?? -Infinity) -
        (a.navChangePercent ?? -Infinity),
    )
    .slice(0, safeLimit)
}

/**
 * Fetch top losers using real NAV day-change data.
 */
export async function fetchTopLosers(
  limit = 5,
): Promise<MutualFund[]> {
  const safeLimit = Math.max(1, Math.min(limit, 20))

  const { funds } = await fetchFundsFromApi({
    page: 1,
    pageSize: 100,
  })

  return [...funds]
    .filter(
      (fund) =>
        typeof fund.navChangePercent === 'number' &&
        Number.isFinite(fund.navChangePercent),
    )
    .sort(
      (a, b) =>
        (a.navChangePercent ?? Infinity) -
        (b.navChangePercent ?? Infinity),
    )
    .slice(0, safeLimit)
}

/**
 * Trending funds.
 *
 * Until the backend exposes a dedicated trending endpoint,
 * use real day-change data rather than fabricated CAGR values.
 */
export async function fetchTrendingFunds(
  limit = 6,
): Promise<MutualFund[]> {
  return fetchTopGainers(limit)
}
