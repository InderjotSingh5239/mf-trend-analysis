import { useEffect, useState } from 'react'
import {
  TrendingUp,
  ShieldAlert,
  BarChart3,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { calculateMonteCarlo } from '@/services/calculatorService'
import type { ApiMonteCarloResponse } from '@/types/api'

export default function MonteCarloCalculator() {
  const [initialInvestment, setInitialInvestment] = useState(100000)
  const [monthlyContribution, setMonthlyContribution] = useState(10000)
  const [annualReturn, setAnnualReturn] = useState(12)
  const [volatility, setVolatility] = useState(18)
  const [years, setYears] = useState(10)
  const [simulations, setSimulations] = useState(1000)

  const [result, setResult] = useState<ApiMonteCarloResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await calculateMonteCarlo({
          initial_investment: initialInvestment,
          monthly_contribution: monthlyContribution,
          expected_annual_return_percent: annualReturn,
          annual_volatility_percent: volatility,
          duration_years: years,
          num_simulations: simulations,
        })

        setResult(response)
      } catch (err) {
        console.error(err)
        setError('Unable to run Monte Carlo simulation.')
        setResult(null)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [
    initialInvestment,
    monthlyContribution,
    annualReturn,
    volatility,
    years,
    simulations,
  ])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-500" />

          <h1 className="text-2xl font-semibold text-ink-950 dark:text-white">
            Monte Carlo Simulation
          </h1>
        </div>

        <p className="mt-1 text-sm text-ink-500 dark:text-paper-200/60">
          Explore a range of possible investment outcomes using thousands of
          simulated market scenarios.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Simulation Inputs</CardTitle>

            <CardDescription>
              Configure your investment assumptions
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <NumberInput
              label="Initial Investment"
              value={initialInvestment}
              min={0}
              max={100000000}
              step={5000}
              onChange={setInitialInvestment}
              currency
            />

            <NumberInput
              label="Monthly Contribution"
              value={monthlyContribution}
              min={0}
              max={1000000}
              step={500}
              onChange={setMonthlyContribution}
              currency
            />

            <NumberInput
              label="Expected Annual Return"
              value={annualReturn}
              min={0}
              max={50}
              step={0.5}
              onChange={setAnnualReturn}
              suffix="%"
            />

            <NumberInput
              label="Annual Volatility"
              value={volatility}
              min={0}
              max={100}
              step={0.5}
              onChange={setVolatility}
              suffix="%"
            />

            <NumberInput
              label="Investment Duration"
              value={years}
              min={1}
              max={50}
              step={1}
              onChange={setYears}
              suffix=" years"
            />

            <NumberInput
              label="Number of Simulations"
              value={simulations}
              min={100}
              max={10000}
              step={100}
              onChange={setSimulations}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {loading && (
            <Card>
              <CardContent className="p-8 text-center">
                Running {simulations.toLocaleString()} simulations...
              </CardContent>
            </Card>
          )}

          {error && (
            <Card>
              <CardContent className="p-8 text-center text-red-500">
                {error}
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ResultCard
                  title="Mean Final Value"
                  value={formatCurrency(result.mean_final_value, true)}
                  icon={<TrendingUp className="w-5 h-5" />}
                />

                <ResultCard
                  title="Median Final Value"
                  value={formatCurrency(result.median_final_value, true)}
                  icon={<BarChart3 className="w-5 h-5" />}
                />

                <ResultCard
                  title="Probability of Loss"
                  value={`${result.probability_of_loss.toFixed(2)}%`}
                  icon={<ShieldAlert className="w-5 h-5" />}
                  danger={result.probability_of_loss > 20}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Outcome Distribution</CardTitle>

                  <CardDescription>
                    Simulated final portfolio values across different market
                    scenarios
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Outcome
                      label="Worst Case"
                      value={result.worst_case}
                    />

                    <Outcome
                      label="5th Percentile"
                      value={result.percentile_5}
                    />

                    <Outcome
                      label="25th Percentile"
                      value={result.percentile_25}
                    />

                    <Outcome
                      label="75th Percentile"
                      value={result.percentile_75}
                    />

                    <Outcome
                      label="95th Percentile"
                      value={result.percentile_95}
                    />

                    <Outcome
                      label="Best Case"
                      value={result.best_case}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Simulation Summary</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <SummaryRow
                    label="Simulations"
                    value={result.num_simulations.toLocaleString()}
                  />

                  <SummaryRow
                    label="Investment Duration"
                    value={`${result.duration_years} years`}
                  />

                  <SummaryRow
                    label="Mean Final Value"
                    value={formatCurrency(
                      result.mean_final_value,
                      true
                    )}
                  />

                  <SummaryRow
                    label="Median Final Value"
                    value={formatCurrency(
                      result.median_final_value,
                      true
                    )}
                  />

                  <SummaryRow
                    label="5th Percentile"
                    value={formatCurrency(
                      result.percentile_5,
                      true
                    )}
                  />

                  <SummaryRow
                    label="95th Percentile"
                    value={formatCurrency(
                      result.percentile_95,
                      true
                    )}
                  />

                  <SummaryRow
                    label="Probability of Loss"
                    value={`${result.probability_of_loss.toFixed(2)}%`}
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

function NumberInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  currency = false,
  suffix = '',
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  currency?: boolean
  suffix?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink-950 dark:text-white">
          {label}
        </label>

        <span className="text-xs text-ink-500 dark:text-paper-200/50">
          {currency ? formatCurrency(value, true) : `${value}${suffix}`}
        </span>
      </div>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value)

          if (!Number.isNaN(next)) {
            onChange(next)
          }
        }}
        className="w-full rounded-md border border-ink-950/10 dark:border-white/10 bg-transparent p-2.5"
      />
    </div>
  )
}

function ResultCard({
  title,
  value,
  icon,
  danger = false,
}: {
  title: string
  value: string
  icon: React.ReactNode
  danger?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-ink-500 dark:text-paper-200/50">
          {icon}

          <p className="text-xs uppercase">
            {title}
          </p>
        </div>

        <p
          className={`mt-2 text-2xl font-semibold ${
            danger
              ? 'text-red-600'
              : 'text-blue-600 dark:text-blue-400'
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function Outcome({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-ink-950/10 dark:border-white/10 p-4">
      <p className="text-xs text-ink-500 dark:text-paper-200/50">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-ink-950 dark:text-white">
        {formatCurrency(value, true)}
      </p>
    </div>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink-950/5 dark:border-white/5 pb-3">
      <span className="text-sm text-ink-500 dark:text-paper-200/50">
        {label}
      </span>

      <span className="font-medium text-ink-950 dark:text-white">
        {value}
      </span>
    </div>
  )
}
