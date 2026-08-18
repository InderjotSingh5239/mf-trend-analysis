import { useEffect, useState, type ReactNode } from 'react'
import { WatchlistContext } from '@/contexts/watchlist-context'

function loadInitial(): string[] {
  try {
    const raw = localStorage.getItem('mf-watchlist')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>(loadInitial)

  useEffect(() => {
    localStorage.setItem('mf-watchlist', JSON.stringify(watchlist))
  }, [watchlist])

  const isWatched = (fundId: string) => watchlist.includes(fundId)

  const toggleWatch = (fundId: string) => {
    setWatchlist((prev) =>
      prev.includes(fundId) ? prev.filter((id) => id !== fundId) : [...prev, fundId]
    )
  }

  return (
    <WatchlistContext.Provider value={{ watchlist, isWatched, toggleWatch }}>
      {children}
    </WatchlistContext.Provider>
  )
}
