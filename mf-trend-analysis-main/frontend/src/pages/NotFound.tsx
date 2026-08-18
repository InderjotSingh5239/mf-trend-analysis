import { Link } from 'react-router-dom'
import { TrendingDown, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper-50 dark:bg-ink-950 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-crimson-500/10 flex items-center justify-center mb-6">
        <TrendingDown className="w-8 h-8 text-crimson-500" />
      </div>
      <p className="font-mono-data text-sm text-ink-500 dark:text-paper-200/50 mb-2">ERROR 404</p>
      <h1 className="font-display font-bold text-3xl text-ink-950 dark:text-white mb-3">This page went to zero</h1>
      <p className="text-sm text-ink-500 dark:text-paper-200/50 mb-8 max-w-sm">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link to="/dashboard">
        <Button>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </Link>
    </div>
  )
}
