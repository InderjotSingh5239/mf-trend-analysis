import type {
  PredictionHorizon,
  PredictionResult,
} from '@/types/fund'
import type {
  ApiPredictionListResponse,
} from '@/types/api'
import { apiClient } from '@/api/client'
import { adaptApiPrediction } from '@/services/predictionAdapter'
import { fetchFundById } from '@/services/fundService'

export class PredictionNotAvailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PredictionNotAvailableError'
  }
}

async function requestPredictionFromApi(
  fundId: string,
  horizon: PredictionHorizon,
): Promise<PredictionResult> {
  if (!fundId) {
    throw new PredictionNotAvailableError(
      'A valid fund ID is required for prediction.',
    )
  }

  try {
    const fund = await fetchFundById(fundId)

    if (!fund?.navHistory?.length || fund.nav == null) {
      throw new PredictionNotAvailableError(
        'Current NAV/history is not available for this fund.',
      )
    }

    // Inference uses an already-trained model. Training remains an admin task.
    const response =
      await apiClient.post<ApiPredictionListResponse>(
        `/predictions/${encodeURIComponent(fundId)}/generate`,
      )

    const data = response.data

    const match = data.predictions.find(
      (prediction) => prediction.horizon_days === horizon,
    )

    if (!match) {
      throw new PredictionNotAvailableError(
        `No ${horizon}-day prediction was generated for this fund.`,
      )
    }

    return {
      ...adaptApiPrediction(match, fund.nav),
      fundId,
      currentNav: fund.nav,
      forecastSeries:
        data.historical_nav.length > 0
          ? [
              ...data.historical_nav.slice(-90).map((point) => ({
                date: point.date,
                nav: point.nav,
                lowerBound: point.nav,
                upperBound: point.nav,
              })),
              {
                date: match.target_date,
                nav: match.predicted_nav,
                lowerBound: match.lower_bound ?? match.predicted_nav,
                upperBound: match.upper_bound ?? match.predicted_nav,
              },
            ]
          : adaptApiPrediction(match, fund.nav).forecastSeries,
    }
  } catch (error) {
    if (error instanceof PredictionNotAvailableError) {
      throw error
    }

    throw new PredictionNotAvailableError(
      error instanceof Error
        ? error.message
        : 'Prediction service is unavailable.',
    )
  }
}

export async function requestPrediction(
  fundId: string,
  horizon: PredictionHorizon,
): Promise<PredictionResult> {
  return requestPredictionFromApi(fundId, horizon)
}

/**
 * Read-only fetch of each fund's most recently *persisted* prediction
 * (no generation triggered — this hits GET /predictions/{id}, not the
 * POST .../generate endpoint). Used for surfaces like the dashboard
 * that show several funds at once and must not silently relabel
 * "trending" or fabricate a recommendation: a fund with no persisted
 * prediction (model not yet run for it) is simply omitted from the
 * result, not backfilled with a guess.
 */
export async function fetchLatestPredictionsForFunds(
  fundIds: string[],
  horizon: PredictionHorizon = 30,
): Promise<PredictionResult[]> {
  const uniqueIds = [...new Set(fundIds)]
  if (uniqueIds.length === 0) return []

  const settled = await Promise.allSettled(
    uniqueIds.map(async (fundId) => {
      const [predResponse, fund] = await Promise.all([
        apiClient.get<ApiPredictionListResponse>(
          `/predictions/${encodeURIComponent(fundId)}`,
        ),
        fetchFundById(fundId),
      ])

      const currentNav = fund?.nav ?? 0
      const match =
        predResponse.data.predictions.find((p) => p.horizon_days === horizon) ??
        predResponse.data.predictions[0]

      if (!match) {
        throw new PredictionNotAvailableError('No persisted prediction for this fund.')
      }

      return {
        ...adaptApiPrediction(match, currentNav),
        fundId,
      }
    }),
  )

  return settled
    .filter(
      (result): result is PromiseFulfilledResult<PredictionResult> =>
        result.status === 'fulfilled',
    )
    .map((result) => result.value)
}
