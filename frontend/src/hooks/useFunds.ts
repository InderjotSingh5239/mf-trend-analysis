import { useQuery } from '@tanstack/react-query'
import {
  fetchFunds,
  fetchFundById,
  fetchTopGainers,
  fetchTopLosers,
  fetchTrendingFunds,
  type FundFilters,
} from '@/services/fundService'

export function useFunds(
  filters: FundFilters = {},
) {
  return useQuery({
    queryKey: ['funds', filters],
    queryFn: () => fetchFunds(filters),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useFund(id?: string) {
  return useQuery({
    queryKey: ['fund', id],
    queryFn: () => fetchFundById(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useTopGainers(limit = 5) {
  return useQuery({
    queryKey: ['funds', 'top-gainers', limit],
    queryFn: () => fetchTopGainers(limit),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useTopLosers(limit = 5) {
  return useQuery({
    queryKey: ['funds', 'top-losers', limit],
    queryFn: () => fetchTopLosers(limit),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useTrendingFunds(limit = 6) {
  return useQuery({
    queryKey: ['funds', 'trending', limit],
    queryFn: () => fetchTrendingFunds(limit),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Watchlist funds are fetched from the real fund API.
 * IDs are supplied by the watchlist state.
 */
export function useWatchlistFunds(
  fundIds: string[] = [],
) {
  return useQuery({
    queryKey: ['funds', 'watchlist', fundIds],
    queryFn: async () => {
      const uniqueIds = [...new Set(fundIds)]

      if (uniqueIds.length === 0) {
        return []
      }

      const results = await Promise.all(
        uniqueIds.map((id) =>
          fetchFundById(id),
        ),
      )

      return results.filter(
        (fund): fund is NonNullable<typeof fund> =>
          Boolean(fund),
      )
    },
    enabled: fundIds.length > 0,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
