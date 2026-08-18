import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)}Cr`
    if (Math.abs(value) >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)}L`
    if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`
  }
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPercent(value: number, showSign = true): string {
  const sign = value > 0 && showSign ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(2)}Cr`
  if (Math.abs(value) >= 1_00_000) return `${(value / 1_00_000).toFixed(2)}L`
  return value.toLocaleString('en-IN')
}

/**
 * Recharts tooltip/legend formatter callbacks receive a `ValueType`
 * (`string | number | Array<string | number> | undefined`), not a plain
 * `number`. This safely narrows that down to a number for use with
 * formatCurrency/formatPercent, without resorting to `any`.
 */
export function chartValueToNumber(
  value: string | number | ReadonlyArray<string | number> | undefined
): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  if (Array.isArray(value)) return chartValueToNumber(value[0])
  return 0
}
