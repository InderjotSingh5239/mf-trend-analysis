import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { WatchlistContext } from '@/contexts/watchlist-context'
import { useAuth } from '@/hooks/useAuth'
import {
  addWatchlistItem,
  createWatchlist,
  listWatchlists,
  removeWatchlistItem,
} from '@/services/watchlistService'
import { fetchFundById } from '@/services/fundService'

export function WatchlistProvider({
  children,
}: {
  children: ReactNode
}) {
  const { isAuthenticated } = useAuth()
  const [watchlistId, setWatchlistId] =
    useState<string | null>(null)
  const [watchlist, setWatchlist] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!isAuthenticated) {
        setWatchlistId(null)
        setWatchlist([])
        return
      }

      try {
        let lists = await listWatchlists()
        let primary = lists[0]

        if (!primary) {
          primary = await createWatchlist()
          lists = [primary]
        }

        if (cancelled) return

        setWatchlistId(primary.id)
        setWatchlist(
          primary.items?.map((item) => item.fund_id) ?? [],
        )
      } catch {
        if (!cancelled) {
          setWatchlistId(null)
          setWatchlist([])
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const isWatched = useCallback(
    (fundId: string) => watchlist.includes(fundId),
    [watchlist],
  )

  const toggleWatch = useCallback(
    (fundId: string) => {
      if (!watchlistId) return

      const wasWatched = watchlist.includes(fundId)

      setWatchlist((current) =>
        wasWatched
          ? current.filter((id) => id !== fundId)
          : [...current, fundId],
      )

      void (async () => {
        try {
          if (wasWatched) {
            await removeWatchlistItem(
              watchlistId,
              fundId,
            )
            return
          }

          const fund = await fetchFundById(fundId)
          if (!fund) {
            throw new Error('Fund not found')
          }

          await addWatchlistItem(
            watchlistId,
            fundId,
            fund.name,
          )
        } catch {
          setWatchlist((current) =>
            wasWatched
              ? [...current, fundId]
              : current.filter((id) => id !== fundId),
          )
        }
      })()
    },
    [watchlist, watchlistId],
  )

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        isWatched,
        toggleWatch,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  )
}
