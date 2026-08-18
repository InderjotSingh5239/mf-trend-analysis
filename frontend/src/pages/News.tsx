import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useNews, type NewsCategory } from '@/hooks/useNews'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import type { NewsItem } from '@/services/newsService'

const CATEGORIES: NewsCategory[] = [
  'All',
  'Markets',
  'Mutual Funds',
  'Economy',
  'RBI Policy',
  'Global',
]

type Sentiment = 'Neutral' | 'Positive' | 'Negative'

const SENTIMENT_STYLE: Record<
  Sentiment,
  {
    badge: 'emerald' | 'crimson' | 'blue'
    icon: typeof TrendingUp
  }
> = {
  Positive: {
    badge: 'emerald',
    icon: TrendingUp,
  },
  Negative: {
    badge: 'crimson',
    icon: TrendingDown,
  },
  Neutral: {
    badge: 'blue',
    icon: Minus,
  },
}

function getSentiment(value?: string): Sentiment {
  if (value === 'Positive') return 'Positive'
  if (value === 'Negative') return 'Negative'
  return 'Neutral'
}

export default function News() {
  const [category, setCategory] = useState<NewsCategory>('All')

  const { data, isLoading, isError, error } = useNews(category)

  const news: NewsItem[] = data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </span>
          News & Market Insights
        </h1>

        <p className="text-sm text-ink-500 dark:text-paper-200/50 mt-1">
          Curated updates relevant to mutual fund investors.
        </p>
      </div>

      <Tabs
        value={category}
        onValueChange={(value) =>
          setCategory(value as NewsCategory)
        }
      >
        <TabsList>
          {CATEGORIES.map((item) => (
            <TabsTrigger key={item} value={item}>
              {item}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-40 rounded-2xl"
            />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-ink-950 dark:text-white">
              Unable to load news
            </p>

            <p className="text-xs text-ink-500 dark:text-paper-200/50 mt-2">
              {error instanceof Error
                ? error.message
                : 'Please try again later.'}
            </p>
          </CardContent>
        </Card>
      ) : news.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-ink-500 dark:text-paper-200/60">
              No news available for this category.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {news.map((item: NewsItem) => {
            const sentiment = getSentiment(
              item.sentimentLabel,
            )

            const {
              badge,
              icon: Icon,
            } = SENTIMENT_STYLE[sentiment]

            return (
              <Card
                key={item.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    {item.category ? (
                      <Badge variant="outline">
                        {item.category}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        Markets
                      </Badge>
                    )}

                    <Badge variant={badge}>
                      <Icon className="w-3 h-3" />
                      {sentiment}
                    </Badge>
                  </div>

                  <h3 className="font-display font-semibold text-ink-950 dark:text-white mb-2 leading-snug">
                    {item.title}
                  </h3>

                  {item.summary && (
                    <p className="text-sm text-ink-500 dark:text-paper-200/60 leading-relaxed mb-3">
                      {item.summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 text-xs text-ink-500 dark:text-paper-200/40 font-mono-data">
                    <span>
                      {item.source ?? 'Market News'}
                    </span>

                    <span>
                      {item.publishedAt
                        ? new Date(
                            item.publishedAt,
                          ).toLocaleDateString(
                            'en-IN',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            },
                          )
                        : 'Recently'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
