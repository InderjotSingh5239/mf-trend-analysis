import { useQuery } from '@tanstack/react-query'
import { calculateLumpsum, calculateSip } from '@/services/calculatorService'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export interface SipCalculatorInputs {
  monthly_investment: number
  duration_years: number
  expected_annual_return_percent: number
  step_up_percent?: number
  inflation_percent?: number
}

export function useSipProjection(inputs: SipCalculatorInputs) {
  const debounced = useDebouncedValue(inputs, 350)
  return useQuery({
    queryKey: ['sip-projection', debounced],
    queryFn: () => calculateSip(debounced),
    placeholderData: (prev) => prev,
    retry: 1,
  })
}

export interface LumpsumCalculatorInputs {
  principal: number
  duration_years: number
  expected_annual_return_percent: number
  inflation_percent?: number
}

export function useLumpsumProjection(inputs: LumpsumCalculatorInputs) {
  const debounced = useDebouncedValue(inputs, 350)
  return useQuery({
    queryKey: ['lumpsum-projection', debounced],
    queryFn: () => calculateLumpsum(debounced),
    placeholderData: (prev) => prev,
    retry: 1,
  })
}
