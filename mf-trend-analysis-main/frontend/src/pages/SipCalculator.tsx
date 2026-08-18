import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AllocationDonut } from '@/components/charts/AllocationDonut'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartValueToNumber, formatCurrency } from '@/lib/utils'
import { SliderInput } from '@/components/common/SliderInput'
import { Loader } from '@/components/common/Loader'
import { ErrorState } from '@/components/common/ErrorState'
import { useSipProjection } from '@/hooks/useCalculators'

export default function SipCalculator() {
  const [monthly, setMonthly] = useState(10000)
  const [years, setYears] = useState(15)
  const [annualReturn, setAnnualReturn] = useState(12)

  const {
    data: result,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSipProjection({
    monthly_investment: monthly,
    duration_years: years,
    expected_annual_return_percent: annualReturn,
    step_up_percent: 0,
    inflation_percent: 0,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
          <Calculator className="w-6 h-6" /> SIP Calculator
        </h1>
        <p className="text-sm text-ink-500 dark:text-paper-200/50">
          Estimate the future value of a monthly Systematic Investment Plan.{' '}
          <Link to="/calculators/lumpsum" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Try lumpsum instead →
          </Link>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Investment Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SliderInput label="Monthly Investment" value={monthly} min={500} max={100000} step={500} onChange={setMonthly} format={(v) => formatCurrency(v, true)} />
            <SliderInput label="Investment Period" value={years} min={1} max={30} step={1} onChange={setYears} format={(v) => `${v} years`} />
            <SliderInput label="Expected Annual Return" value={annualReturn} min={1} max={30} step={0.5} onChange={setAnnualReturn} format={(v) => `${v}%`} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="py-16">
                <Loader label="CALCULATING..." />
              </CardContent>
            </Card>
          ) : isError || !result ? (
            <Card>
              <CardContent>
                <ErrorState
                  title="Couldn't calculate your SIP projection"
                  description={error instanceof Error ? error.message : 'The calculator service is currently unavailable.'}
                  onRetry={() => refetch()}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">Invested Amount</p>
                    <p className="text-2xl font-mono-data font-semibold text-ink-950 dark:text-white">{formatCurrency(result.total_invested, true)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">Estimated Returns</p>
                    <p className="text-2xl font-mono-data font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(result.estimated_returns, true)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-ink-500 dark:text-paper-200/50 uppercase mb-1">Total Value</p>
                    <p className="text-2xl font-mono-data font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(result.maturity_value, true)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                <CardHeader>
                  <CardTitle>Growth Projection</CardTitle>
                  <CardDescription>Invested vs. projected value over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={result.yearly_breakdown} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sipValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2f6fed" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#2f6fed" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="sipInvested" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#64748b" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#64748b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                      <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickFormatter={(v) => formatCurrency(v, true)} axisLine={false} tickLine={false} width={64} />
                      <Tooltip
                        formatter={(value) => formatCurrency(chartValueToNumber(value))}
                        labelFormatter={(label) => `Year ${label}`}
                        separator=" : "
                        cursor={{ stroke: '#10b981' }}
                      />
                      <Area type="monotone" dataKey="value" name="Projected Value" stroke="#2f6fed" fill="url(#sipValue)" strokeWidth={2} />
                      <Area type="monotone" dataKey="invested" name="Invested" stroke="#64748b" fill="url(#sipInvested)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Investment Split</CardTitle>
                </CardHeader>
                <CardContent>
                  <AllocationDonut
                    data={[
                      { name: 'Invested', value: result.total_invested },
                      { name: 'Returns', value: result.estimated_returns },
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
