import { apiClient } from '@/api/client'
import type { ApiPortfolio, ApiPortfolioSummary, ApiTransaction } from '@/types/api'
import { adaptPortfolio, adaptSummary, adaptTransaction } from '@/services/portfolioAdapter'
import type { Portfolio, PortfolioSummary, Transaction } from '@/services/portfolioAdapter'

export async function fetchPortfolios(): Promise<Portfolio[]> {
  const { data } = await apiClient.get<ApiPortfolio[]>('/portfolios')
  return data.map(adaptPortfolio)
}

export async function createPortfolio(input: {
  name: string
  description?: string
  baseCurrency?: string
}): Promise<Portfolio> {
  const { data } = await apiClient.post<ApiPortfolio>('/portfolios', {
    name: input.name,
    description: input.description ?? null,
    base_currency: input.baseCurrency ?? 'INR',
  })
  return adaptPortfolio(data)
}

export async function fetchPortfolioSummary(portfolioId: string): Promise<PortfolioSummary> {
  const { data } = await apiClient.get<ApiPortfolioSummary>(`/portfolios/${portfolioId}/summary`)
  return adaptSummary(data)
}

export async function fetchTransactions(portfolioId: string): Promise<Transaction[]> {
  const { data } = await apiClient.get<ApiTransaction[]>(`/portfolios/${portfolioId}/transactions`)
  return data.map(adaptTransaction)
}

export interface AddTransactionInput {
  fundId: string
  fundName: string
  transactionType: ApiTransaction['transaction_type']
  units: number
  nav: number
  transactionDate: string
  sector?: string
  category?: string
}

export async function addTransaction(portfolioId: string, input: AddTransactionInput): Promise<Transaction> {
  const { data } = await apiClient.post<ApiTransaction>(`/portfolios/${portfolioId}/transactions`, {
    fund_id: input.fundId,
    fund_name: input.fundName,
    transaction_type: input.transactionType,
    units: input.units,
    nav: input.nav,
    transaction_date: input.transactionDate,
    sector: input.sector ?? null,
    category: input.category ?? null,
  })
  return adaptTransaction(data)
}
