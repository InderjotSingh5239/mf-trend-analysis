import { useQuery } from '@tanstack/react-query'
import { fetchFunds, fetchFundById, fetchTopGainers, fetchTopLosers, fetchTrendingFunds } from '@/services/fundService'
import type { FundFilters } from '@/services/fundService'
import { fetchFundRiskProfile } from '@/services/marketService'

export function useFunds(filters: FundFilters) {
  return useQuery({
    queryKey: ['funds', filters],
    queryFn: () => fetchFunds(filters),
    placeholderData: (prev) => prev,
  })
}

export function useFund(id: string | undefined) {
  return useQuery({
    queryKey: ['fund', id],
    queryFn: () => fetchFundById(id as string),
    enabled: !!id,
  })
}

export function useTopGainers(limit = 5) {
  return useQuery({ queryKey: ['top-gainers', limit], queryFn: () => fetchTopGainers(limit) })
}

export function useTopLosers(limit = 5) {
  return useQuery({ queryKey: ['top-losers', limit], queryFn: () => fetchTopLosers(limit) })
}

export function useTrendingFunds(limit = 6) {
  return useQuery({ queryKey: ['trending-funds', limit], queryFn: () => fetchTrendingFunds(limit) })
}

export function useWatchlistFunds(fundIds: string[]) {
  return useQuery({
    queryKey: ['watchlist-funds', fundIds],
    queryFn: async () => {
      const results = await Promise.all(fundIds.map((id) => fetchFundById(id)))
      return results.filter((f): f is NonNullable<typeof f> => !!f)
    },
    enabled: fundIds.length > 0,
  })
}

export function useFundRiskProfile(fundId: string | undefined) {
  return useQuery({
    queryKey: ['fund-risk-profile', fundId],
    queryFn: () => fetchFundRiskProfile(fundId as string),
    enabled: !!fundId,
    retry: 1,
  })
}
