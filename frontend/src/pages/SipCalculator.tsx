import { useEffect, useState } from 'react'
import { Calculator, AlertCircle, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { AllocationDonut } from '@/components/charts/AllocationDonut'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { chartValueToNumber, formatCurrency } from '@/lib/utils'
import { calculateSip } from '@/services/calculatorService'
import { Link } from 'react-router-dom'
import type { ApiSipResponse } from '@/types/api'

export default function SipCalculator() {
  const [monthly, setMonthly] = useState(10000)
  const [years, setYears] = useState(15)
  const [annualReturn, setAnnualReturn] = useState(12)
  const [stepUp, setStepUp] = useState(0)
  const [inflation, setInflation] = useState(0)

  const [result, setResult] = useState<ApiSipResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const timer = window.setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await calculateSip({
          monthly_investment: monthly,
          duration_years: years,
          expected_annual_return_percent: annualReturn,
          step_up_percent: stepUp,
          inflation_percent: inflation,
        })

        if (!cancelled) {
          setResult(response)
        }
      } catch (err) {
        if (!cancelled) {
          setResult(null)

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to calculate SIP. Please try again.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [monthly, years, annualReturn, stepUp, inflation])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Calculator className="w-6 h-6 text-emerald-500" />

          <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white">
            SIP Calculator
          </h1>
        </div>

        <p className="mt-1 text-sm text-ink-500 dark:text-paper-200/60">
          Estimate the future value of a monthly Systematic Investment Plan.
        </p>

        <Link
          to="/calculators/lumpsum"
          className="inline-block mt-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          Try lumpsum instead →
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* INPUTS */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Investment Inputs</CardTitle>

            <CardDescription>
              Adjust your investment assumptions.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <SliderInput
              label="Monthly Investment"
              value={monthly}
              min={500}
              max={100000}
              step={500}
              onChange={setMonthly}
              format={(v) => formatCurrency(v)}
            />

            <SliderInput
              label="Investment Period"
              value={years}
              min={1}
              max={40}
              step={1}
              onChange={setYears}
              format={(v) => `${v} years`}
            />

            <SliderInput
              label="Expected Annual Return"
              value={annualReturn}
              min={1}
              max={30}
              step={0.5}
              onChange={setAnnualReturn}
              format={(v) => `${v}%`}
            />

            <SliderInput
              label="Annual Step-Up"
              value={stepUp}
              min={0}
              max={30}
              step={1}
              onChange={setStepUp}
              format={(v) => `${v}%`}
            />

            <SliderInput
              label="Inflation"
              value={inflation}
              min={0}
              max={15}
              step={0.5}
              onChange={setInflation}
              format={(v) => `${v}%`}
            />
          </CardContent>
        </Card>

        {/* RESULTS */}
        <div className="lg:col-span-2 space-y-6">
          {isLoading && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />

                <p className="text-sm text-ink-500 dark:text-paper-200/60">
                  Calculating using the backend...
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && error && (
            <Card>
              <CardContent className="py-10 flex flex-col items-center justify-center gap-3 text-center">
                <AlertCircle className="w-8 h-8 text-amber-500" />

                <p className="font-medium text-ink-950 dark:text-white">
                  SIP calculation failed
                </p>

                <p className="text-sm text-ink-500 dark:text-paper-200/60 max-w-md">
                  {error}
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && result && (
            <>
              {/* SUMMARY */}
              <div className="grid sm:grid-cols-3 gap-4">
                <ResultCard
                  label="Invested Amount"
                  value={formatCurrency(result.total_invested, true)}
                />

                <ResultCard
                  label="Estimated Returns"
                  value={formatCurrency(result.estimated_returns, true)}
                  valueClassName="text-emerald-600 dark:text-emerald-400"
                />

                <ResultCard
                  label="Total Value"
                  value={formatCurrency(result.maturity_value, true)}
                  valueClassName="text-blue-600 dark:text-blue-400"
                />
              </div>

              {/* INFLATION ADJUSTED */}
              {result.inflation_adjusted_value != null && (
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">
                      Inflation Adjusted Value
                    </p>

                    <p className="text-2xl font-mono-data font-semibold text-ink-950 dark:text-white">
                      {formatCurrency(
                        result.inflation_adjusted_value,
                        true,
                      )}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* GROWTH CHART */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth Projection</CardTitle>

                  <CardDescription>
                    Invested amount vs projected portfolio value over time.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {result.yearly_breakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart
                        data={result.yearly_breakdown}
                        margin={{
                          top: 8,
                          right: 8,
                          left: 0,
                          bottom: 0,
                        }}
                      >
                        <defs>
                          <linearGradient
                            id="sipValue"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#2f6fed"
                              stopOpacity={0.3}
                            />

                            <stop
                              offset="100%"
                              stopColor="#2f6fed"
                              stopOpacity={0}
                            />
                          </linearGradient>

                          <linearGradient
                            id="sipInvested"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#64748b"
                              stopOpacity={0.25}
                            />

                            <stop
                              offset="100%"
                              stopColor="#64748b"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(100,116,139,0.15)"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="year"
                          tickFormatter={(value) => `Y${value}`}
                          tick={{
                            fontSize: 11,
                            fontFamily: 'IBM Plex Mono',
                          }}
                          axisLine={false}
                          tickLine={false}
                        />

                        <YAxis
                          tick={{
                            fontSize: 11,
                            fontFamily: 'IBM Plex Mono',
                          }}
                          tickFormatter={(value) =>
                            formatCurrency(Number(value), true)
                          }
                          axisLine={false}
                          tickLine={false}
                          width={64}
                        />

                        <Tooltip
                          formatter={(value) =>
                            formatCurrency(chartValueToNumber(value))
                          }
                          labelFormatter={(label) => `Year ${label}`}
                          separator=" : "
                          cursor={{ stroke: '#10b981' }}
                        />

                        <Area
                          type="monotone"
                          dataKey="value"
                          name="Projected Value"
                          stroke="#2f6fed"
                          fill="url(#sipValue)"
                          strokeWidth={2}
                        />

                        <Area
                          type="monotone"
                          dataKey="invested"
                          name="Invested"
                          stroke="#64748b"
                          fill="url(#sipInvested)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="py-10 text-center text-sm text-ink-500 dark:text-paper-200/50">
                      No yearly breakdown was returned by the backend.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* INVESTMENT SPLIT */}
              <Card>
                <CardHeader>
                  <CardTitle>Investment Split</CardTitle>

                  <CardDescription>
                    Principal invested vs estimated returns.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <AllocationDonut
                    data={[
                      {
                        name: 'Invested',
                        value: Math.max(0, result.total_invested),
                      },
                      {
                        name: 'Returns',
                        value: Math.max(0, result.estimated_returns),
                      },
                    ]}
                    height={200}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultCard({
  label,
  value,
  valueClassName = 'text-ink-950 dark:text-white',
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">
          {label}
        </p>

        <p
          className={`text-2xl font-mono-data font-semibold ${valueClassName}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format: (value: number) => string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-ink-950 dark:text-paper-100">
          {label}
        </label>

        <span className="text-sm font-mono-data text-ink-500 dark:text-paper-200/60">
          {format(value)}
        </span>
      </div>

      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const nextValue = Number(event.target.value)

          if (Number.isFinite(nextValue)) {
            onChange(nextValue)
          }
        }}
        className="w-full accent-emerald-500"
      />

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const nextValue = Number(event.target.value)

          if (Number.isFinite(nextValue)) {
            onChange(
              Math.min(
                max,
                Math.max(min, nextValue),
              ),
            )
          }
        }}
        className="w-full rounded-md border border-ink-950/10 dark:border-white/10 bg-white dark:bg-white/5 p-2 text-sm text-ink-950 dark:text-white"
      />
    </div>
  )
}
