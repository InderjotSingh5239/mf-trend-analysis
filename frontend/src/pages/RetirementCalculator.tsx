import { useEffect, useState } from 'react'
import {TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { calculateRetirement } from '@/services/calculatorService'
import type { ApiRetirementResponse } from '@/types/api'

export default function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState(25)
  const [retirementAge, setRetirementAge] = useState(60)
  const [currentSavings, setCurrentSavings] = useState(100000)
  const [monthlyInvestment, setMonthlyInvestment] = useState(10000)
  const [annualReturn, setAnnualReturn] = useState(12)
  const [stepUp, setStepUp] = useState(5)
  const [annualExpense, setAnnualExpense] = useState(600000)
  const [inflation, setInflation] = useState(6)
  const [lifeExpectancy, setLifeExpectancy] = useState(80)

  const [result, setResult] = useState<ApiRetirementResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (retirementAge <= currentAge) {
      setResult(null)
      setError('Retirement age must be greater than current age.')
      return
    }

    if (lifeExpectancy <= retirementAge) {
      setResult(null)
      setError('Life expectancy must be greater than retirement age.')
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await calculateRetirement({
          current_age: currentAge,
          retirement_age: retirementAge,
          current_savings: currentSavings,
          monthly_investment: monthlyInvestment,
          expected_annual_return_percent: annualReturn,
          expected_annual_step_up_percent: stepUp,
          post_retirement_annual_expense: annualExpense,
          inflation_percent: inflation,
          life_expectancy_age: lifeExpectancy,
        })

        setResult(response)
      } catch (err) {
        console.error('Retirement calculator error:', err)
        setResult(null)
        setError('Unable to calculate retirement projection.')
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [
    currentAge,
    retirementAge,
    currentSavings,
    monthlyInvestment,
    annualReturn,
    stepUp,
    annualExpense,
    inflation,
    lifeExpectancy,
  ])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          <h1 className="text-2xl font-display font-semibold text-ink-950 dark:text-white">
            Retirement Calculator
          </h1>
        </div>

        <p className="mt-1 text-sm text-ink-500 dark:text-paper-200/60">
          Estimate whether your investments can support your retirement goals.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Retirement Inputs</CardTitle>
            <CardDescription>
              Adjust your financial assumptions.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <InputField
              label="Current Age"
              value={currentAge}
              min={18}
              max={70}
              step={1}
              onChange={setCurrentAge}
            />

            <InputField
              label="Retirement Age"
              value={retirementAge}
              min={30}
              max={80}
              step={1}
              onChange={setRetirementAge}
            />

            <InputField
              label="Current Savings"
              value={currentSavings}
              min={0}
              max={100000000}
              step={5000}
              onChange={setCurrentSavings}
              formatCurrencyValue
            />

            <InputField
              label="Monthly Investment"
              value={monthlyInvestment}
              min={500}
              max={1000000}
              step={500}
              onChange={setMonthlyInvestment}
              formatCurrencyValue
            />

            <InputField
              label="Expected Annual Return"
              value={annualReturn}
              min={1}
              max={30}
              step={0.5}
              onChange={setAnnualReturn}
              suffix="%"
            />

            <InputField
              label="Annual Step-Up"
              value={stepUp}
              min={0}
              max={30}
              step={1}
              onChange={setStepUp}
              suffix="%"
            />

            <InputField
              label="Annual Retirement Expense"
              value={annualExpense}
              min={10000}
              max={10000000}
              step={10000}
              onChange={setAnnualExpense}
              formatCurrencyValue
            />

            <InputField
              label="Inflation"
              value={inflation}
              min={0}
              max={15}
              step={0.5}
              onChange={setInflation}
              suffix="%"
            />

            <InputField
              label="Life Expectancy"
              value={lifeExpectancy}
              min={retirementAge + 1}
              max={100}
              step={1}
              onChange={setLifeExpectancy}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {error && (
            <Card>
              <CardContent className="p-5 flex items-center gap-3 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-ink-500">
                  Calculating retirement projection...
                </p>
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <ResultCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  title="Years to Retirement"
                  value={`${result.years_to_retirement} years`}
                />

                <ResultCard
                  icon={<ShieldCheck className="w-5 h-5" />}
                  title="Corpus at Retirement"
                  value={formatCurrency(result.corpus_at_retirement, true)}
                />

                <ResultCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  title="Required Corpus"
                  value={formatCurrency(
                    result.required_corpus_at_retirement,
                    true
                  )}
                />

                <ResultCard
                  icon={
                    result.corpus_sufficient ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )
                  }
                  title={result.corpus_sufficient ? 'Status' : 'Shortfall'}
                  value={
                    result.corpus_sufficient
                      ? 'Goal Achievable'
                      : formatCurrency(
                          Math.abs(result.shortfall_or_surplus),
                          true
                        )
                  }
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Retirement Analysis</CardTitle>
                  <CardDescription>
                    Based on the assumptions provided above.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex justify-between border-b pb-3">
                    <span className="text-sm text-ink-500">
                      Years to retirement
                    </span>
                    <strong>{result.years_to_retirement}</strong>
                  </div>

                  <div className="flex justify-between border-b pb-3">
                    <span className="text-sm text-ink-500">
                      Projected retirement corpus
                    </span>
                    <strong>
                      {formatCurrency(result.corpus_at_retirement, true)}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b pb-3">
                    <span className="text-sm text-ink-500">
                      Required retirement corpus
                    </span>
                    <strong>
                      {formatCurrency(
                        result.required_corpus_at_retirement,
                        true
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b pb-3">
                    <span className="text-sm text-ink-500">
                      Surplus / Shortfall
                    </span>
                    <strong
                      className={
                        result.shortfall_or_surplus >= 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }
                    >
                      {formatCurrency(result.shortfall_or_surplus, true)}
                    </strong>
                  </div>

                  {!result.corpus_sufficient &&
                    result.monthly_investment_needed_if_shortfall !== null && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4">
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          Additional monthly investment required
                        </p>

                        <p className="text-2xl font-semibold mt-1">
                          {formatCurrency(
                            result.monthly_investment_needed_if_shortfall,
                            true
                          )}
                        </p>
                      </div>
                    )}

                  {result.corpus_sufficient && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-4">
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        Your projected retirement corpus is sufficient under
                        the assumptions provided.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function InputField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  formatCurrencyValue = false,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  suffix?: string
  formatCurrencyValue?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink-900 dark:text-white">
          {label}
        </label>

        <span className="text-sm text-ink-500 dark:text-paper-200/60">
          {formatCurrencyValue
            ? formatCurrency(value, true)
            : `${value}${suffix ?? ''}`}
        </span>
      </div>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const nextValue = Number(event.target.value)

          if (!Number.isNaN(nextValue)) {
            onChange(nextValue)
          }
        }}
        className="w-full rounded-md border border-ink-950/10 dark:border-white/10 bg-white dark:bg-ink-900 p-2 text-sm"
      />
    </div>
  )
}

function ResultCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode
  title: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          {icon}
          <span className="text-xs uppercase text-ink-500 dark:text-paper-200/50">
            {title}
          </span>
        </div>

        <p className="mt-2 text-2xl font-mono-data font-semibold text-ink-950 dark:text-white">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
