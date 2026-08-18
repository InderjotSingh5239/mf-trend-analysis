import { apiClient } from '@/api/client'
import type {
  ApiWatchlist,
  ApiWatchlistItem,
} from '@/types/api'

export async function listWatchlists(): Promise<ApiWatchlist[]> {
  const response = await apiClient.get<ApiWatchlist[]>('/watchlists')
  return response.data
}

export async function createWatchlist(
  name = 'My Watchlist',
): Promise<ApiWatchlist> {
  const response = await apiClient.post<ApiWatchlist>(
    '/watchlists',
    { name },
  )
  return response.data
}

export async function addWatchlistItem(
  watchlistId: string,
  fundId: string,
  fundName: string,
): Promise<ApiWatchlistItem> {
  const response =
    await apiClient.post<ApiWatchlistItem>(
      `/watchlists/${encodeURIComponent(watchlistId)}/items`,
      {
        fund_id: fundId,
        fund_name: fundName,
      },
    )
  return response.data
}

export async function removeWatchlistItem(
  watchlistId: string,
  fundId: string,
): Promise<void> {
  await apiClient.delete(
    `/watchlists/${encodeURIComponent(watchlistId)}/items/${encodeURIComponent(fundId)}`,
  )
}
