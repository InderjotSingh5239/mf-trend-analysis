import { apiClient } from '@/api/client'
import type {
  ApiPortfolio,
  ApiPortfolioSummary,
} from '@/types/api'

export async function listPortfolios(): Promise<ApiPortfolio[]> {
  const response =
    await apiClient.get<ApiPortfolio[]>('/portfolios')
  return response.data
}

export async function createPortfolio(
  name = 'My Portfolio',
): Promise<ApiPortfolio> {
  const response =
    await apiClient.post<ApiPortfolio>(
      '/portfolios',
      { name, base_currency: 'INR' },
    )
  return response.data
}

export async function fetchPortfolioSummary(
  portfolioId: string,
): Promise<ApiPortfolioSummary> {
  const response =
    await apiClient.get<ApiPortfolioSummary>(
      `/portfolios/${encodeURIComponent(portfolioId)}/summary`,
    )
  return response.data
}
