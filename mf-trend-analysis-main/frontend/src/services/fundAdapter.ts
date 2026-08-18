import type { ApiMutualFund, ApiMutualFundDetail } from '@/types/api'
import type { MutualFund, NavPoint } from '@/types/fund'

function toNavHistory(points: ApiMutualFundDetail['nav_history']): NavPoint[] {
  const sorted = [...points].sort((a, b) => a.nav_date.localeCompare(b.nav_date))
  return sorted.map((p, i) => {
    const window = (n: number) => {
      const start = Math.max(0, i - n + 1)
      const slice = sorted.slice(start, i + 1)
      return slice.reduce((sum, s) => sum + s.nav_value, 0) / slice.length
    }
    return {
      date: p.nav_date,
      nav: p.nav_value,
      ma30: i >= 29 ? Math.round(window(30) * 100) / 100 : undefined,
      ma90: i >= 89 ? Math.round(window(90) * 100) / 100 : undefined,
    }
  })
}

/**
 * Maps a real /funds list-item response into the app's MutualFund shape.
 * Fields the backend has no data source for (rating, holdings, sector/asset
 * allocation, trailing-period returns, manager tenure, min SIP) are left
 * `undefined` — see MutualFund's doc comment and docs/API_INTEGRATION.md.
 */
export function adaptApiFund(api: ApiMutualFund): MutualFund {
  return {
    id: api.id,
    name: api.scheme_name,
    amc: api.amc_name ?? undefined,
    category: api.category ?? undefined,
    riskLevel: api.risk_category ?? undefined,
    nav: api.latest_nav ?? undefined,
    navChange:
      api.latest_nav != null && api.nav_change_percent != null
        ? Math.round(((api.latest_nav * api.nav_change_percent) / (100 + api.nav_change_percent)) * 100) / 100
        : undefined,
    navChangePercent: api.nav_change_percent ?? undefined,
    expenseRatio: api.expense_ratio ?? undefined,
    exitLoad: api.exit_load ?? undefined,
    aum: api.aum_crore ?? undefined,
    fundManager: api.fund_manager ?? undefined,
    fundAgeYears: api.launch_date
      ? Math.floor((Date.now() - new Date(api.launch_date).getTime()) / (365.25 * 24 * 3600 * 1000))
      : undefined,
    minLumpsumAmount: api.min_investment ?? undefined,
    benchmark: api.benchmark_index ?? undefined,
    navHistory: [],
    isin: api.isin_growth ?? undefined,
  }
}

export function adaptApiFundDetail(api: ApiMutualFundDetail): MutualFund {
  return {
    ...adaptApiFund(api),
    navHistory: toNavHistory(api.nav_history),
  }
}
