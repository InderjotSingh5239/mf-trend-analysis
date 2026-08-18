import { apiClient } from '@/api/client'

export type NewsCategory =
  | 'Markets'
  | 'Mutual Funds'
  | 'Economy'
  | 'RBI Policy'
  | 'Global'

export type NewsSentiment =
  | 'Neutral'
  | 'Positive'
  | 'Negative'

export interface NewsItem {
  id: string
  title: string
  summary?: string
  source?: string
  category?: string
  sentimentLabel?: NewsSentiment
  publishedAt?: string
  url?: string
}

export interface NewsResponse {
  items: NewsItem[]
  total: number
  page: number
  pageSize: number
}

interface ApiNewsItem {
  id: string | number
  title?: string
  headline?: string
  summary?: string | null
  source?: string | null
  category?: string | null
  sentiment?: string | null
  sentiment_label?: string | null
  published_at?: string | null
  publishedAt?: string | null
  url?: string | null
  article_url?: string | null
}

interface ApiNewsResponse {
  items?: ApiNewsItem[]
  total?: number
  page?: number
  page_size?: number
}

function normalizeSentiment(
  value?: string | null,
): NewsSentiment {
  if (!value) return 'Neutral'

  const normalized = value.toLowerCase()

  if (normalized.includes('positive')) {
    return 'Positive'
  }

  if (normalized.includes('negative')) {
    return 'Negative'
  }

  return 'Neutral'
}

function adaptNewsItem(
  item: ApiNewsItem,
): NewsItem {
  return {
    id: String(item.id),
    title: item.title ?? item.headline ?? 'Market Update',
    summary: item.summary ?? undefined,
    source: item.source ?? undefined,
    category: item.category ?? undefined,
    sentimentLabel: normalizeSentiment(
      item.sentiment_label ?? item.sentiment,
    ),
    publishedAt:
      item.published_at ??
      item.publishedAt ??
      undefined,
    url:
      item.article_url ??
      item.url ??
      undefined,
  }
}

export async function fetchNews(params: {
  page?: number
  pageSize?: number
  category?: string
} = {}): Promise<NewsResponse> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20

  const response = await apiClient.get<ApiNewsResponse>(
    '/news',
    {
      params: {
        page,
        page_size: pageSize,
        category: params.category || undefined,
      },
    },
  )

  const data = response.data

  const items = (data.items ?? []).map(
    adaptNewsItem,
  )

  return {
    items,
    total: data.total ?? items.length,
    page: data.page ?? page,
    pageSize: data.page_size ?? pageSize,
  }
}
