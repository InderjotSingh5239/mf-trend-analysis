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
import { useLumpsumProjection } from '@/hooks/useCalculators'

export default function LumpsumCalculator() {
  const [principal, setPrincipal] = useState(100000)
  const [years, setYears] = useState(10)
  const [annualReturn, setAnnualReturn] = useState(12)

  const {
    data: result,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useLumpsumProjection({
    principal,
    duration_years: years,
    expected_annual_return_percent: annualReturn,
    inflation_percent: 0,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
          <Calculator className="w-6 h-6" /> Lumpsum Calculator
        </h1>
        <p className="text-sm text-ink-500 dark:text-paper-200/50">
          Estimate the future value of a one-time investment.{' '}
          <Link to="/calculators/sip" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Try SIP instead →
          </Link>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Investment Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SliderInput label="Lumpsum Amount" value={principal} min={5000} max={5000000} step={5000} onChange={setPrincipal} format={(v) => formatCurrency(v, true)} />
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
                  title="Couldn't calculate your lumpsum projection"
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
                    <p className="text-2xl font-mono-data font-semibold text-ink-950 dark:text-white">{formatCurrency(result.principal, true)}</p>
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
                  <CardDescription>Compounded growth over the investment period</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart
                      data={result.yearly_breakdown.map((item) => ({
                        year: item.year,
                        value: item.value,
                        invested: item.invested,
                      }))}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="lumpValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0fae72" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#0fae72" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="lumpPrincipal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#64748b" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#64748b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                      <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickFormatter={(v) => formatCurrency(v, true)} axisLine={false} tickLine={false} width={64} />
                      <Tooltip formatter={(v) => formatCurrency(chartValueToNumber(v))} labelFormatter={(v) => `Year ${v}`} />
                      <Area type="monotone" dataKey="value" name="Value" stroke="#0fae72" fill="url(#lumpValue)" strokeWidth={2} />
                      <Area type="monotone" dataKey="invested" name="Principal" stroke="#64748b" fill="url(#lumpPrincipal)" strokeWidth={2} />
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
                      { name: 'Principal', value: result.principal },
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
