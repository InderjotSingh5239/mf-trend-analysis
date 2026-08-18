import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFunds } from '@/hooks/useFunds'
import { usePrediction } from '@/hooks/usePrediction'
import { PredictionNotAvailableError } from '@/services/predictionService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader } from '@/components/common/Loader'
import { ForecastChart } from '@/components/charts/ForecastChart'
import type { PredictionHorizon, Recommendation } from '@/types/fund'
import { cn, formatPercent } from '@/lib/utils'

const HORIZONS: PredictionHorizon[] = [7, 30, 90, 180, 365]

const RECOMMENDATION_STYLE: Record<Recommendation, { badge: 'emerald' | 'amber' | 'crimson'; icon: typeof TrendingUp }> = {
  Buy: { badge: 'emerald', icon: TrendingUp },
  Hold: { badge: 'amber', icon: Minus },
  Sell: { badge: 'crimson', icon: TrendingDown },
}

export default function AIPrediction() {
  const { id } = useParams<{ id: string }>()
  const { data: fundsPage, isLoading: fundsLoading } = useFunds({ pageSize: 50 })
  const funds = fundsPage?.funds ?? []

  const [fundId, setFundId] = useState(id ?? '')
  const [horizon, setHorizon] = useState<PredictionHorizon>(30)
  const { mutate, data: result, isPending, isError, error, reset } = usePrediction()

  useEffect(() => {
    if (id) setFundId(id)
  }, [id])

  // Default to the first loaded fund once the list arrives, unless the user
  // (or the URL) has already picked one — no effect needed, just derive it.
  const effectiveFundId = fundId || funds[0]?.id || ''
  const fund = funds.find((f) => f.id === effectiveFundId)

  const onPredict = () => {
    reset()
    if (effectiveFundId) mutate({ fundId: effectiveFundId, horizon })
  }

  const RecIcon = result ? RECOMMENDATION_STYLE[result.recommendation].icon : Sparkles

  if (fundsLoading) return <Loader label="LOADING FUNDS..." className="min-h-[40vh]" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-500" /> AI NAV Prediction
        </h1>
        <p className="text-sm text-ink-500 dark:text-paper-200/50">
          Model-generated NAV forecast based on historical trend, volatility, and fund fundamentals.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Select Fund</label>
              <Select value={effectiveFundId} onChange={(e) => { setFundId(e.target.value); reset() }}>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Prediction Horizon</label>
              <Select value={horizon} onChange={(e) => { setHorizon(Number(e.target.value) as PredictionHorizon); reset() }}>
                {HORIZONS.map((h) => (
                  <option key={h} value={h}>
                    {h} Days
                  </option>
                ))}
              </Select>
            </div>
            <Button size="lg" onClick={onPredict} disabled={isPending || !effectiveFundId} className="sm:w-40">
              {isPending ? 'Predicting...' : 'Predict'}
              {!isPending && <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {isPending && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-4">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-sm font-mono-data text-ink-500 dark:text-paper-200/60">
                  RUNNING PREDICTION MODEL ON {(fund?.name ?? 'FUND').toUpperCase()}...
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!isPending && isError && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <p className="text-sm font-medium text-ink-950 dark:text-white">
                  {error instanceof PredictionNotAvailableError
                    ? 'No prediction available yet'
                    : 'Something went wrong'}
                </p>
                <p className="text-sm text-ink-500 dark:text-paper-200/50 max-w-md">
                  {error instanceof Error ? error.message : 'Please try again.'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!isPending && !isError && result && (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">Current NAV</p>
                  <p className="text-xl font-mono-data font-semibold text-ink-950 dark:text-white">₹{result.currentNav.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">Predicted NAV</p>
                  <p className="text-xl font-mono-data font-semibold text-blue-600 dark:text-blue-400">₹{result.predictedNav.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">Expected Return</p>
                  <p className={cn('text-xl font-mono-data font-semibold', result.expectedReturnPercent >= 0 ? 'ticker-up' : 'ticker-down')}>
                    {formatPercent(result.expectedReturnPercent)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">Confidence</p>
                  <p className="text-xl font-mono-data font-semibold text-ink-950 dark:text-white">{result.confidenceScore}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">Risk Score</p>
                  <p className="text-xl font-mono-data font-semibold text-ink-950 dark:text-white">{result.riskScore}/10</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>Forecast Trajectory</CardTitle>
                  <CardDescription>Shaded band represents the model's confidence interval</CardDescription>
                </div>
                <Badge variant={RECOMMENDATION_STYLE[result.recommendation].badge} className="text-sm px-3 py-1">
                  <RecIcon className="w-3.5 h-3.5" /> {result.recommendation}
                </Badge>
              </CardHeader>
              <CardContent>
                <ForecastChart result={result} currentNav={fund?.nav ?? result.currentNav} />
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Confidence Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-ink-500 dark:text-paper-200/60">Model Confidence</span>
                      <span className="font-mono-data font-medium text-ink-950 dark:text-white">{result.confidenceScore}%</span>
                    </div>
                    <Progress value={result.confidenceScore} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-ink-500 dark:text-paper-200/60">Risk Score</span>
                      <span className="font-mono-data font-medium text-ink-950 dark:text-white">{result.riskScore}/10</span>
                    </div>
                    <Progress value={result.riskScore * 10} barClassName="bg-amber-500" />
                  </div>
                  <p className="text-xs text-ink-500 dark:text-paper-200/40 pt-2 flex gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Confidence decreases for longer horizons and higher-volatility funds. This is a statistical estimate, not a guarantee.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Feature Importance</CardTitle>
                  <CardDescription>What drove this prediction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.featureImportance.length > 0 ? (
                    result.featureImportance.map((f) => (
                      <div key={f.feature}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-ink-500 dark:text-paper-200/60">{f.feature}</span>
                          <span className="font-mono-data text-ink-950 dark:text-white">{f.importance}%</span>
                        </div>
                        <Progress value={f.importance} barClassName="bg-blue-500" className="h-1.5" />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-ink-500 dark:text-paper-200/50 py-4 text-center">
                      Feature importance isn't exposed by the current prediction API.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <p className="text-[11px] text-ink-500 dark:text-paper-200/30 text-center">
              Model: {result.modelVersion} · Generated {new Date(result.generatedAt).toLocaleString('en-IN')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
