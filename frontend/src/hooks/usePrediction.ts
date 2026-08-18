import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchLatestPredictionsForFunds, requestPrediction } from '@/services/predictionService'
import type { PredictionHorizon } from '@/types/fund'

export function usePrediction() {
  return useMutation({
    mutationFn: ({ fundId, horizon }: { fundId: string; horizon: PredictionHorizon }) =>
      requestPrediction(fundId, horizon),
  })
}

/**
 * Read-only, for surfaces (e.g. dashboard) that show existing
 * model-backed predictions for a set of funds without triggering
 * generation. Funds with no persisted prediction are simply absent
 * from the result — see fetchLatestPredictionsForFunds.
 */
export function useLatestPredictions(fundIds: string[], horizon: PredictionHorizon = 30) {
  return useQuery({
    queryKey: ['predictions', 'latest', fundIds, horizon],
    queryFn: () => fetchLatestPredictionsForFunds(fundIds, horizon),
    enabled: fundIds.length > 0,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
