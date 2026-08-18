import type { NewsItem } from '@/types/news'
import type { ApiNews } from '@/types/api'

// The backend's news ETL tags each article with the NewsAPI query string
// that found it (see backend app/etl/news_etl.py DEFAULT_QUERIES), not a
// clean category label. This maps those query strings to the frontend's
// existing category set; anything unrecognized buckets into 'Markets'
// rather than being dropped.
const CATEGORY_MAP: Record<string, NewsItem['category']> = {
  'mutual fund india': 'Mutual Funds',
  'sebi mutual fund': 'Mutual Funds',
  'nse bse india stock market': 'Markets',
  'rbi monetary policy': 'RBI Policy',
}

function mapCategory(apiCategory: string | null): NewsItem['category'] {
  if (!apiCategory) return 'Markets'
  return CATEGORY_MAP[apiCategory.toLowerCase()] ?? 'Markets'
}

function mapSentiment(label: string | null): NewsItem['sentiment'] {
  if (label === 'positive') return 'Positive'
  if (label === 'negative') return 'Negative'
  return 'Neutral'
}

export function adaptApiNews(api: ApiNews): NewsItem {
  return {
    id: api.id,
    headline: api.title,
    summary: api.summary ?? '',
    source: api.source ?? 'Unknown source',
    category: mapCategory(api.category),
    sentiment: mapSentiment(api.sentiment_label),
    publishedAt: api.published_at,
    url: api.url,
  }
}
