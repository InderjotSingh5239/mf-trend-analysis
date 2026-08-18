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
import { Loader } from '@/components/common/Loader'
import { useFund, useTrendingFunds } from '@/hooks/useFunds'
import { formatPercent } from '@/lib/utils'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-powered NAV forecasts',
    description:
      'Model-backed forecasts using real historical NAV data, with confidence and risk indicators.',
  },
  {
    icon: LineChart,
    title: 'Performance analytics',
    description:
      'Explore NAV history, rolling returns, volatility and drawdown from real backend data.',
  },
  {
    icon: GitCompareArrows,
    title: 'Fund comparison',
    description:
      'Compare multiple live fund records side by side without fabricated metrics.',
  },
  {
    icon: Calculator,
    title: 'Investment planning',
    description:
      'Run SIP, lumpsum, retirement and Monte Carlo calculations through FastAPI.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk-first research',
    description:
      'Use volatility, drawdown and portfolio risk metrics alongside returns.',
  },
  {
    icon: Star,
    title: 'Persistent watchlists',
    description:
      'Save funds to your account-backed watchlist and access them across sessions.',
  },
]

export default function Landing() {
  const { data: trending } = useTrendingFunds(1)
  // The trending/list response only carries latest-NAV metadata; the
  // hero chart needs full NAV history, which only the fund-detail
  // endpoint returns (see PROJECT_AUDIT.md item B).
  const { data: previewFund, isLoading } = useFund(trending?.[0]?.id)

  return (
    <div className="bg-ink-950 text-white min-h-screen">
      <header className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg">
            NAVigate
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/about"
            className="hidden sm:block text-sm text-paper-200/70 hover:text-white"
          >
            About
          </Link>
          <Link to="/dashboard">
            <Button size="sm">
              Launch App
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      <TickerTape />

      <section className="max-w-[1400px] mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono-data mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            REAL API DATA · FASTAPI
          </div>

          <h1 className="font-display font-bold text-4xl sm:text-5xl leading-[1.1] mb-5">
            Research your mutual funds with real data and model-backed insights.
          </h1>

          <p className="text-paper-200/60 text-lg leading-relaxed mb-8 max-w-lg">
            NAVigate connects mutual-fund NAV data, portfolio analytics,
            calculators and trained prediction models through one production
            workflow.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/dashboard">
              <Button size="lg">
                Open Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/predict">
              <Button
                size="lg"
                variant="outline"
                className="border-white/15 text-white hover:bg-white/10"
              >
                Try AI Prediction
              </Button>
            </Link>
          </div>

          <p className="text-xs text-paper-200/40 mt-6 max-w-md">
            Predictions are statistical model estimates for informational
            purposes only and are not investment advice.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-ink-900/70 border-white/10 shadow-2xl">
            <CardContent className="p-5">
              {isLoading ? (
                <Loader label="LOADING LIVE FUND DATA..." />
              ) : previewFund ? (
                <>
                  <div className="flex items-center justify-between mb-4 gap-4">
                    <div className="min-w-0">
                      <p className="font-display font-semibold truncate">
                        {previewFund.name}
                      </p>
                      <p className="text-xs text-paper-200/50">
                        {previewFund.amc ?? 'Mutual Fund'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono-data text-xl font-semibold">
                        {previewFund.nav == null
                          ? '—'
                          : `₹${previewFund.nav.toFixed(2)}`}
                      </p>
                      <p className="text-xs font-mono-data ticker-up">
                        {formatPercent(
                          previewFund.navChangePercent ?? 0,
                        )}
                      </p>
                    </div>
                  </div>

                  <NavHistoryChart
                    data={previewFund.navHistory}
                    height={200}
                  />

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-[10px] text-paper-200/40 uppercase">
                        Expense Ratio
                      </p>
                      <p className="font-mono-data font-medium text-blue-400">
                        {previewFund.expenseRatio == null
                          ? '—'
                          : `${previewFund.expenseRatio}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-paper-200/40 uppercase">
                        Risk
                      </p>
                      <p className="font-mono-data font-medium text-emerald-400">
                        {previewFund.riskLevel ?? '—'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-sm text-paper-200/50">
                  Live fund data is currently unavailable.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 py-16 border-t border-white/5">
        <div className="max-w-xl mb-12">
          <h2 className="font-display font-bold text-3xl mb-3">
            One connected platform
          </h2>
          <p className="text-paper-200/60">
            Every major workflow is designed around the same backend data
            instead of disconnected mock screens.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="bg-ink-900/50 border-white/10"
            >
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="font-display font-semibold mb-1.5">
                  {feature.title}
                </p>
                <p className="text-sm text-paper-200/50 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 py-16">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
          <CardContent className="p-10 text-center">
            <h2 className="font-display font-bold text-2xl sm:text-3xl mb-3">
              Start with live fund data
            </h2>
            <p className="text-paper-200/60 mb-6 max-w-lg mx-auto">
              Explore the fund database, then move into analytics, prediction,
              portfolio and investment planning.
            </p>
            <Link to="/explore">
              <Button size="lg">
                Explore Funds
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </div>
  )
}
