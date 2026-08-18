import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addTransaction,
  createPortfolio,
  fetchPortfolioSummary,
  fetchPortfolios,
  fetchTransactions,
} from '@/services/portfolioService'
import type { AddTransactionInput } from '@/services/portfolioService'

export function usePortfolios(enabled: boolean) {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: fetchPortfolios,
    enabled,
  })
}

export function usePortfolioSummary(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['portfolio-summary', portfolioId],
    queryFn: () => fetchPortfolioSummary(portfolioId as string),
    enabled: !!portfolioId,
  })
}

export function usePortfolioTransactions(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['portfolio-transactions', portfolioId],
    queryFn: () => fetchTransactions(portfolioId as string),
    enabled: !!portfolioId,
  })
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    },
  })
}

export function useAddTransaction(portfolioId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddTransactionInput) => addTransaction(portfolioId as string, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary', portfolioId] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-transactions', portfolioId] })
    },
  })
}
