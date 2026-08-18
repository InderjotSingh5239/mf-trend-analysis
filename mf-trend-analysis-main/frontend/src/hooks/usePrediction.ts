import { useMutation } from '@tanstack/react-query'
import { requestPrediction } from '@/services/predictionService'
import type { PredictionHorizon } from '@/types/fund'

export function usePrediction() {
  return useMutation({
    mutationFn: ({ fundId, horizon }: { fundId: string; horizon: PredictionHorizon }) =>
      requestPrediction(fundId, horizon),
  })
}
