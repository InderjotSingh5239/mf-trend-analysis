import type { ApiPrediction } from '@/types/api'
import type { PredictionHorizon, PredictionResult, Recommendation } from '@/types/fund'

function mapRecommendation(raw: string): Recommendation {
  const normalized = raw.toLowerCase()
  if (normalized.includes('buy')) return 'Buy'
  if (normalized.includes('sell')) return 'Sell'
  return 'Hold'
}

/**
 * @param currentNav the fund's latest known NAV, used as the series' start
 *   point — the backend's prediction record only stores the target-date
 *   forecast, not the fund's NAV as of the prediction date, so this is
 *   passed in separately by the caller (predictionService.requestPrediction).
 */
export function adaptApiPrediction(api: ApiPrediction, currentNav: number): PredictionResult {
  const lower = api.lower_bound ?? api.predicted_nav * 0.95
  const upper = api.upper_bound ?? api.predicted_nav * 1.05

  return {
    fundId: '', // filled in by the caller, which already knows the fund id
    horizon: api.horizon_days as PredictionHorizon,
    currentNav,
    predictedNav: api.predicted_nav,
    expectedReturnPercent: api.expected_return_pct,
    confidenceScore: Math.round(api.confidence_score * 100),
    recommendation: mapRecommendation(api.recommendation),
    riskScore: Math.max(1, Math.min(10, Math.round(api.risk_score / 10))),
    forecastSeries: [
      { date: api.prediction_date, nav: currentNav, lowerBound: currentNav, upperBound: currentNav },
      { date: api.target_date, nav: api.predicted_nav, lowerBound: lower, upperBound: upper },
    ],
    generatedAt: api.created_at,
    modelVersion: 'production-model', // the backend doesn't expose which model produced this on the prediction record itself; see GET /ml/leaderboard/{fund_id} for the fund's trained-model leaderboard
    featureImportance: [], // not exposed by the API — see docs/API_INTEGRATION.md
  }
}
