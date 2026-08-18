import type { MutualFund, PredictionHorizon, PredictionResult, Recommendation } from '@/types/fund'

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return h
}

const FEATURE_POOL = [
  'NAV 30-day Moving Average',
  '90-day Volatility',
  'Benchmark Index Momentum',
  'AUM Growth Trend',
  'Sector Rotation (Financials)',
  'Interest Rate Sensitivity',
  'Relative Strength Index (RSI)',
  'Fund Manager Alpha (Historical)',
  'Macro: 10Y G-Sec Yield',
  'Expense Ratio Impact',
]

/**
 * Simulates an ML inference call. In production this is replaced 1:1 by a call to
 * POST /api/predict on the FastAPI backend (see services/predictionService.ts).
 */
export function generatePrediction(fund: MutualFund, horizon: PredictionHorizon): PredictionResult {
  const rand = mulberry32(hashSeed(fund.id + horizon + new Date().toDateString()))

  const currentNav = fund.nav ?? 0
  const alpha = fund.riskMetrics?.alpha ?? 0
  const standardDeviation = fund.riskMetrics?.standardDeviation ?? 8

  const annualDrift = alpha / 100 + 0.12
  const horizonYears = horizon / 365
  const volatilityDaily = standardDeviation / 100 / Math.sqrt(252)

  const expectedReturnPercent =
    Math.round((annualDrift * horizonYears + (rand() - 0.5) * 0.04) * 1000) / 10

  const predictedNav = Math.round(currentNav * (1 + expectedReturnPercent / 100) * 100) / 100

  // confidence shrinks with longer horizons and higher volatility
  const baseConfidence = 92 - horizon / 12 - standardDeviation * 0.6
  const confidenceScore = Math.max(52, Math.min(94, Math.round(baseConfidence + (rand() - 0.5) * 6)))

  const riskScore = Math.max(
    1,
    Math.min(10, Math.round(standardDeviation / 2.2 + (rand() - 0.5) * 1.2))
  )

  let recommendation: Recommendation = 'Hold'
  if (expectedReturnPercent > 8 && confidenceScore > 65) recommendation = 'Buy'
  else if (expectedReturnPercent < -2) recommendation = 'Sell'

  const forecastSeries: PredictionResult['forecastSeries'] = []
  const steps = Math.min(horizon, 60)
  const stepSize = horizon / steps
  let runningNav = currentNav
  const today = new Date()

  for (let i = 1; i <= steps; i++) {
    const dayOffset = Math.round(i * stepSize)
    const date = new Date(today)
    date.setDate(date.getDate() + dayOffset)
    const driftStep = (annualDrift / 365) * stepSize
    const shock = (rand() - 0.5) * volatilityDaily * Math.sqrt(stepSize) * 1.4
    runningNav = runningNav * (1 + driftStep + shock)
    const bandWidth = runningNav * volatilityDaily * Math.sqrt(dayOffset) * 1.15

    forecastSeries.push({
      date: date.toISOString().slice(0, 10),
      nav: Math.round(runningNav * 100) / 100,
      lowerBound: Math.round((runningNav - bandWidth) * 100) / 100,
      upperBound: Math.round((runningNav + bandWidth) * 100) / 100,
    })
  }
  // force the terminal point to equal the headline predicted NAV
  if (forecastSeries.length) {
    forecastSeries[forecastSeries.length - 1].nav = predictedNav
  }

  const shuffled = [...FEATURE_POOL].sort(() => rand() - 0.5).slice(0, 6)
  const weights = shuffled.map(() => rand())
  const total = weights.reduce((a, b) => a + b, 0)
  const featureImportance = shuffled
    .map((feature, i) => ({ feature, importance: Math.round((weights[i] / total) * 1000) / 10 }))
    .sort((a, b) => b.importance - a.importance)

  return {
    fundId: fund.id,
    horizon,
    currentNav,
    predictedNav,
    expectedReturnPercent,
    confidenceScore,
    recommendation,
    riskScore,
    forecastSeries,
    generatedAt: new Date().toISOString(),
    modelVersion: 'XGBoost-NAV-v2.3',
    featureImportance,
  }
}
