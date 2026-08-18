import type { ApiPrediction } from '@/types/api'
import type {
  PredictionHorizon,
  PredictionResult,
  Recommendation,
} from '@/types/fund'

function mapRecommendation(raw: string | null | undefined): Recommendation {
  const normalized = String(raw ?? '').trim().toUpperCase()

  if (normalized === 'BUY' || normalized.includes('BUY')) {
    return 'Buy'
  }

  if (normalized === 'SELL' || normalized.includes('SELL')) {
    return 'Sell'
  }

  return 'Hold'
}

function toFiniteNumber(
  value: unknown,
  fallback: number,
): number {
  const numeric = Number(value)

  return Number.isFinite(numeric)
    ? numeric
    : fallback
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(Math.max(value, min), max)
}

export function adaptApiPrediction(
  api: ApiPrediction,
  currentNav: number,
): PredictionResult {
  const predictedNav = toFiniteNumber(
    api.predicted_nav,
    currentNav,
  )

  const lowerBound =
    api.lower_bound != null
      ? toFiniteNumber(
          api.lower_bound,
          predictedNav * 0.95,
        )
      : predictedNav * 0.95

  const upperBound =
    api.upper_bound != null
      ? toFiniteNumber(
          api.upper_bound,
          predictedNav * 1.05,
        )
      : predictedNav * 1.05

  /*
   * Backend confidence:
   * expected range = 0..1
   *
   * Frontend PredictionResult:
   * expected range = 0..100
   */
  const confidenceScore = clamp(
    toFiniteNumber(api.confidence_score, 0),
    0,
    1,
  )

  /*
   * Backend risk score:
   * expected range = 0..100
   *
   * Frontend:
   * displays risk on a 1..10 scale.
   */
  const backendRiskScore = clamp(
    toFiniteNumber(api.risk_score, 0),
    0,
    100,
  )

  const riskScore = clamp(
    Math.round(backendRiskScore / 10),
    1,
    10,
  )

  const expectedReturnPercent = toFiniteNumber(
    api.expected_return_pct,
    predictedNav !== 0
      ? ((predictedNav - currentNav) / currentNav) * 100
      : 0,
  )

  return {
    fundId: '',

    horizon:
      api.horizon_days as PredictionHorizon,

    currentNav,

    predictedNav,

    expectedReturnPercent,

    confidenceScore:
      Math.round(confidenceScore * 100),

    recommendation:
      mapRecommendation(api.recommendation),

    riskScore,

    forecastSeries: [
      {
        date: api.prediction_date,
        nav: currentNav,
        lowerBound: currentNav,
        upperBound: currentNav,
      },
      {
        date: api.target_date,
        nav: predictedNav,
        lowerBound,
        upperBound,
      },
    ],

    generatedAt: api.created_at,

    /*
     * This value should ideally come from the backend
     * once the ML model metadata endpoint is connected.
     */
    modelVersion: 'production-model',

    /*
     * Feature importance should come from the backend
     * explainability/SHAP endpoint when available.
     */
    featureImportance: [],
  }
}
