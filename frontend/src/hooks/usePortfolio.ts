import { useQuery } from '@tanstack/react-query'
import {
  fetchPortfolioSummary,
  listPortfolios,
} from '@/services/portfolioService'

export function usePortfolioSummary(enabled = true) {
  return useQuery({
    queryKey: ['portfolio', 'summary'],
    enabled,
    queryFn: async () => {
      const portfolios = await listPortfolios()
      const portfolio = portfolios[0]
      if (!portfolio) return null
      return fetchPortfolioSummary(portfolio.id)
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}
