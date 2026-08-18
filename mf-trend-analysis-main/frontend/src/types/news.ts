export type NewsCategory = 'Markets' | 'Mutual Funds' | 'Economy' | 'RBI Policy' | 'Global'

export type NewsSentiment = 'Positive' | 'Neutral' | 'Negative'

export interface NewsItem {
  id: string
  headline: string
  summary: string
  source: string
  category: NewsCategory
  sentiment: NewsSentiment
  publishedAt: string
  url?: string
}
