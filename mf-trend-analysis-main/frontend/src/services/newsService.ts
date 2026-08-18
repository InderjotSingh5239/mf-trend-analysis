import type { NewsItem } from '@/types/news'
import type { ApiNews } from '@/types/api'
import { apiClient } from '@/api/client'
import { adaptApiNews } from '@/services/newsAdapter'

export async function fetchNews(category?: NewsItem['category'] | 'All'): Promise<NewsItem[]> {
  const { data } = await apiClient.get<ApiNews[]>('/news', { params: { limit: 50 } })
  const items = data.map(adaptApiNews)
  return !category || category === 'All' ? items : items.filter((n) => n.category === category)
}
