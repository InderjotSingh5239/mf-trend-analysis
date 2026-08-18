import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-ink-950/5 dark:border-white/5 bg-paper-50 dark:bg-ink-950">
      <div className="max-w-[1400px] mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-ink-950 dark:text-white">NAVigate</span>
          </div>
          <p className="text-sm text-ink-500 dark:text-paper-200/50 leading-relaxed">
            AI-assisted mutual fund analytics for the informed investor.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-paper-200/40 mb-3">Product</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/dashboard" className="text-ink-500 dark:text-paper-200/60 hover:text-emerald-600 dark:hover:text-emerald-400">Dashboard</Link>
            <Link to="/predict" className="text-ink-500 dark:text-paper-200/60 hover:text-emerald-600 dark:hover:text-emerald-400">AI Prediction</Link>
            <Link to="/compare" className="text-ink-500 dark:text-paper-200/60 hover:text-emerald-600 dark:hover:text-emerald-400">Compare Funds</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-paper-200/40 mb-3">Tools</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/calculators/sip" className="text-ink-500 dark:text-paper-200/60 hover:text-emerald-600 dark:hover:text-emerald-400">SIP Calculator</Link>
            <Link to="/calculators/lumpsum" className="text-ink-500 dark:text-paper-200/60 hover:text-emerald-600 dark:hover:text-emerald-400">Lumpsum Calculator</Link>
            <Link to="/news" className="text-ink-500 dark:text-paper-200/60 hover:text-emerald-600 dark:hover:text-emerald-400">Market News</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-paper-200/40 mb-3">Company</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/about" className="text-ink-500 dark:text-paper-200/60 hover:text-emerald-600 dark:hover:text-emerald-400">About</Link>
            <Link to="/settings" className="text-ink-500 dark:text-paper-200/60 hover:text-emerald-600 dark:hover:text-emerald-400">Settings</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-ink-950/5 dark:border-white/5 py-5 px-6 text-center">
        <p className="text-xs text-ink-500 dark:text-paper-200/40">
          © 2026 NAVigate. Mutual fund investments are subject to market risks. Predictions are model estimates, not guarantees. Read all scheme documents carefully.
        </p>
      </div>
    </footer>
  )
}
