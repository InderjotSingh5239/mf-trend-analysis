import { useQuery } from '@tanstack/react-query'
import { fetchNews } from '@/services/newsService'
import type { NewsItem } from '@/types/news'

export function useNews(category?: NewsItem['category'] | 'All') {
  return useQuery({ queryKey: ['news', category], queryFn: () => fetchNews(category) })
}
