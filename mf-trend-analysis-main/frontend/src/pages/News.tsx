import { useState } from 'react'
import { Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useNews } from '@/hooks/useNews'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import type { NewsItem } from '@/types/news'

const CATEGORIES: (NewsItem['category'] | 'All')[] = ['All', 'Markets', 'Mutual Funds', 'Economy', 'RBI Policy', 'Global']

const SENTIMENT_STYLE: Record<NewsItem['sentiment'], { badge: 'emerald' | 'crimson' | 'blue'; icon: typeof TrendingUp }> = {
  Positive: { badge: 'emerald', icon: TrendingUp },
  Negative: { badge: 'crimson', icon: TrendingDown },
  Neutral: { badge: 'blue', icon: Minus },
}

export default function News() {
  const [category, setCategory] = useState<NewsItem['category'] | 'All'>('All')
  const { data: news, isLoading } = useNews(category)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
          <Newspaper className="w-6 h-6" /> News & Market Insights
        </h1>
        <p className="text-sm text-ink-500 dark:text-paper-200/50">Curated updates relevant to mutual fund investors.</p>
      </div>

      <Tabs value={category} onValueChange={(v) => setCategory(v as NewsItem['category'] | 'All')}>
        <TabsList>
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c}>
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {news?.map((item) => {
            const { badge, icon: Icon } = SENTIMENT_STYLE[item.sentiment]
            return (
              <Card key={item.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    <Badge variant={badge}>
                      <Icon className="w-3 h-3" /> {item.sentiment}
                    </Badge>
                  </div>
                  <h3 className="font-display font-semibold text-ink-950 dark:text-white mb-2 leading-snug">{item.headline}</h3>
                  <p className="text-sm text-ink-500 dark:text-paper-200/60 leading-relaxed mb-3">{item.summary}</p>
                  <div className="flex items-center justify-between text-xs text-ink-500 dark:text-paper-200/40 font-mono-data">
                    <span>{item.source}</span>
                    <span>{new Date(item.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
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
