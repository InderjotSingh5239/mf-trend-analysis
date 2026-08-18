import type { ApiNews } from '@/types/api'
import type { NewsItem, NewsCategory, NewsSentiment } from '@/services/newsService'

const CATEGORY_MAP: Record<string, NewsCategory> = {
  'mutual fund india': 'Mutual Funds',
  'sebi mutual fund': 'Mutual Funds',
  'nse bse india stock market': 'Markets',
  'rbi monetary policy': 'RBI Policy',
  'global markets': 'Global',
}

function mapCategory(value: string | null): string {
  if (!value) return 'Markets'
  return CATEGORY_MAP[value.toLowerCase()] ?? value
}

function mapSentiment(value: string | null): NewsSentiment {
  const normalized = value?.toLowerCase()
  if (normalized === 'positive') return 'Positive'
  if (normalized === 'negative') return 'Negative'
  return 'Neutral'
}

export function adaptApiNews(api: ApiNews): NewsItem {
  return {
    id: String(api.id),
    title: api.title,
    summary: api.summary ?? undefined,
    source: api.source ?? undefined,
    category: mapCategory(api.category),
    sentimentLabel: mapSentiment(api.sentiment_label),
    publishedAt: api.published_at,
    url: api.url,
  }
}
