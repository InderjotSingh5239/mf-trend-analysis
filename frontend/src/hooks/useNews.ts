import { useQuery } from '@tanstack/react-query'
import { fetchNews } from '@/services/newsService'

export type NewsCategory =
  | 'All'
  | 'Markets'
  | 'Mutual Funds'
  | 'Economy'
  | 'RBI Policy'
  | 'Global'

export function useNews(category: NewsCategory = 'All') {
  return useQuery({
    queryKey: ['news', category],
    queryFn: () =>
      fetchNews({
        page: 1,
        pageSize: 20,
        category: category === 'All' ? undefined : category,
      }),
  })
}
