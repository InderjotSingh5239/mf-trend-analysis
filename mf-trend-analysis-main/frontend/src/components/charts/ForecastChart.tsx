import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import type { PredictionResult } from '@/types/fund'
import { useTheme } from '@/hooks/useTheme'

function CustomTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const nav = payload.find((p) => p.dataKey === 'nav')
  const upper = payload.find((p) => p.dataKey === 'upperBound')
  const lower = payload.find((p) => p.dataKey === 'lowerBound')
  return (
    <div className="glass-panel rounded-lg border border-ink-950/10 dark:border-white/10 px-3 py-2 text-xs shadow-lg space-y-0.5">
      <p className="text-ink-500 dark:text-paper-200/50 font-mono-data">{label}</p>
      {nav && (
        <p className="font-mono-data font-semibold text-emerald-600 dark:text-emerald-400">
          Forecast: ₹{typeof nav.value === 'number' ? nav.value.toFixed(2) : nav.value}
        </p>
      )}
      {upper && lower && (
        <p className="font-mono-data text-ink-500 dark:text-paper-200/50">
          Range: ₹{typeof lower.value === 'number' ? lower.value.toFixed(2) : lower.value} – ₹
          {typeof upper.value === 'number' ? upper.value.toFixed(2) : upper.value}
        </p>
      )}
    </div>
  )
}

export function ForecastChart({ result, currentNav }: { result: PredictionResult; currentNav: number }) {
  const { theme } = useTheme()
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(10,14,18,0.06)'
  const axisColor = theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(10,14,18,0.45)'
  const bgFill = theme === 'dark' ? '#0a0e12' : '#f6f8f7'

  const chartData = [
    { date: 'Today', nav: currentNav, upperBound: currentNav, lowerBound: currentNav },
    ...result.forecastSeries,
  ]

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f6fed" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#2f6fed" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: axisColor, fontFamily: 'IBM Plex Mono' }}
          tickFormatter={(v) => (v === 'Today' ? v : v.slice(5))}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tick={{ fontSize: 11, fill: axisColor, fontFamily: 'IBM Plex Mono' }}
          domain={['auto', 'auto']}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={CustomTooltip} />
        <ReferenceLine y={currentNav} stroke={axisColor} strokeDasharray="4 4" label={{ value: 'Current NAV', fontSize: 10, fill: axisColor, position: 'insideTopLeft' }} />
        <Area dataKey="upperBound" stroke="none" fill="url(#bandFill)" isAnimationActive={false} />
        <Area dataKey="lowerBound" stroke="none" fill={bgFill} fillOpacity={1} isAnimationActive={false} />
        <Line type="monotone" dataKey="nav" stroke="#0fae72" strokeWidth={2.5} dot={false} name="Predicted NAV" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
