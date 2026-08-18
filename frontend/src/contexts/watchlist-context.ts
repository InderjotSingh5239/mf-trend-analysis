import { createContext } from 'react'

export interface WatchlistContextValue {
  watchlist: string[]
  isWatched: (fundId: string) => boolean
  toggleWatch: (fundId: string) => void
}

export const WatchlistContext = createContext<WatchlistContextValue | undefined>(undefined)
