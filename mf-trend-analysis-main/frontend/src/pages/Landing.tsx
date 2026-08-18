import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  ArrowRight,
  Sparkles,
  LineChart,
  ShieldCheck,
  GitCompareArrows,
  Calculator,
  Star,
} from 'lucide-react'
import { TickerTape } from '@/components/common/TickerTape'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NavHistoryChart } from '@/components/charts/NavHistoryChart'
import { useFunds } from '@/hooks/useFunds'
import { formatPercent } from '@/lib/utils'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-powered NAV forecasts',
    description: 'Machine-learning models trained on historical NAV, macro indicators, and fund fundamentals project where a fund may head next — with a confidence score attached.',
  },
  {
    icon: LineChart,
    title: 'Deep performance analytics',
    description: 'Alpha, beta, Sharpe ratio, rolling returns, and drawdown analysis, laid out the way a fund manager would review it.',
  },
  {
    icon: GitCompareArrows,
    title: 'Side-by-side comparison',
    description: 'Stack up to five funds across returns, risk, and cost to see exactly what separates them.',
  },
  {
    icon: Calculator,
    title: 'SIP & lumpsum planning',
    description: 'Model your investment growth with interactive calculators before you commit a rupee.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk-first design',
    description: 'Every fund is scored on volatility and downside risk, not just headline returns.',
  },
  {
    icon: Star,
    title: 'Watchlists that matter',
    description: 'Track the funds you care about and get a quick read on how they are trending.',
  },
]

export default function Landing() {
  const { data: fundsPage } = useFunds({ pageSize: 1 })
  const previewFund = fundsPage?.funds?.[0]

  return (
    <div className="bg-ink-950 text-white min-h-screen">
      {/* Nav */}
      <header className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg">NAVigate</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/about" className="hidden sm:block text-sm text-paper-200/70 hover:text-white">
            About
          </Link>
          <Link to="/dashboard">
            <Button size="sm">
              Launch App <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      <TickerTape />

      {/* Hero */}
      <section className="max-w-[1400px] mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono-data mb-6 pulse-dot">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            MODEL: XGBOOST-NAV-V2.3 · LIVE
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl leading-[1.1] mb-5">
            Read where your mutual funds are headed, before the market does.
          </h1>
          <p className="text-paper-200/60 text-lg leading-relaxed mb-8 max-w-lg">
            NAVigate blends historical NAV data, fund fundamentals, and macro signals into
            AI-assisted forecasts — so you can move from gut feeling to grounded decisions.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/dashboard">
              <Button size="lg">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/predict">
              <Button size="lg" variant="outline" className="border-white/15 text-white hover:bg-white/10">
                Try AI Prediction
              </Button>
            </Link>
          </div>
          <p className="text-xs text-paper-200/40 mt-6 max-w-md">
            Predictions are statistical model estimates for informational purposes only, not investment advice or a guarantee of future returns.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-ink-900/70 border-white/10 shadow-2xl">
            <CardContent className="p-5">
              {!previewFund ? (
                <div className="h-[280px] flex items-center justify-center text-paper-200/40 text-sm">
                  Loading live fund data...
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-display font-semibold text-white">{previewFund.name}</p>
                      <p className="text-xs text-paper-200/50">{previewFund.amc}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-data text-xl font-semibold text-white">₹{(previewFund.nav ?? 0).toFixed(2)}</p>
                      <p className="text-xs font-mono-data ticker-up">{formatPercent(previewFund.navChangePercent ?? 0)}</p>
                    </div>
                  </div>
                  <NavHistoryChart data={previewFund.navHistory} height={200} />
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-[10px] text-paper-200/40 uppercase tracking-wide">Category</p>
                      <p className="font-mono-data font-medium text-blue-400 truncate">{previewFund.category ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-paper-200/40 uppercase tracking-wide">Risk</p>
                      <p className="font-mono-data font-medium text-emerald-400">{previewFund.riskLevel ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-paper-200/40 uppercase tracking-wide">Expense Ratio</p>
                      <p className="font-mono-data font-medium text-emerald-400">
                        {previewFund.expenseRatio != null ? `${previewFund.expenseRatio}%` : '—'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-[1400px] mx-auto px-6 py-16 border-t border-white/5">
        <div className="max-w-xl mb-12">
          <h2 className="font-display font-bold text-3xl mb-3">Everything you need to evaluate a fund</h2>
          <p className="text-paper-200/60">One platform for research, prediction, and planning — built around how fund decisions actually get made.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="bg-ink-900/50 border-white/10">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="font-display font-semibold text-white mb-1.5">{f.title}</p>
                <p className="text-sm text-paper-200/50 leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1400px] mx-auto px-6 py-16">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
          <CardContent className="p-10 text-center">
            <h2 className="font-display font-bold text-2xl sm:text-3xl mb-3">Start exploring funds in seconds</h2>
            <p className="text-paper-200/60 mb-6 max-w-lg mx-auto">
              No sign-up needed for the demo. Jump into the dashboard and see live-style analytics in action.
            </p>
            <Link to="/dashboard">
              <Button size="lg">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </div>
  )
}
