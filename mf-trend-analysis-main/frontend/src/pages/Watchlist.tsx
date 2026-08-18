import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useWatchlistFunds } from '@/hooks/useFunds'
import { FundCard } from '@/components/common/FundCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Loader } from '@/components/common/Loader'
import { Button } from '@/components/ui/button'

export default function Watchlist() {
  const { watchlist } = useWatchlist()
  const { data: funds, isLoading } = useWatchlistFunds(watchlist)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500" /> Watchlist
        </h1>
        <p className="text-sm text-ink-500 dark:text-paper-200/50">
          {watchlist.length} fund{watchlist.length !== 1 ? 's' : ''} you're tracking
        </p>
      </div>

      {watchlist.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Your watchlist is empty"
          description="Tap the star icon on any fund card to start tracking it here."
        />
      ) : isLoading ? (
        <Loader label="LOADING WATCHLIST..." className="min-h-[30vh]" />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {funds?.map((fund) => (
            <FundCard key={fund.id} fund={fund} />
          ))}
        </div>
      )}

      <div className="pt-2">
        <Link to="/explore">
          <Button variant="secondary">Browse more funds</Button>
        </Link>
      </div>
    </div>
  )
}
