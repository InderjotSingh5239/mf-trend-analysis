import { Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import type { NavPoint } from '@/types/fund'
import { useTheme } from '@/hooks/useTheme'

function CustomTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel rounded-lg border border-ink-950/10 dark:border-white/10 px-3 py-2 text-xs shadow-lg">
      <p className="text-ink-500 dark:text-paper-200/50 mb-1 font-mono-data">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="font-mono-data font-medium" style={{ color: p.color }}>
          {p.name}: ₹{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

export function NavHistoryChart({
  data,
  showMovingAverages = false,
  height = 320,
}: {
  data: NavPoint[]
  showMovingAverages?: boolean
  height?: number
}) {
  const { theme } = useTheme()
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(10,14,18,0.06)'
  const axisColor = theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(10,14,18,0.45)'

  // Downsample for readability on wide date ranges
  const step = Math.max(1, Math.floor(data.length / 120))
  const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={sampled} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0fae72" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#0fae72" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: axisColor, fontFamily: 'IBM Plex Mono' }}
          tickFormatter={(v) => v.slice(5)}
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
        <Area type="monotone" dataKey="nav" name="NAV" stroke="#0fae72" strokeWidth={2} fill="url(#navFill)" />
        {showMovingAverages && (
          <>
            <Line type="monotone" dataKey="ma30" name="30D MA" stroke="#2f6fed" strokeWidth={1.5} dot={false} strokeDasharray="0" />
            <Line type="monotone" dataKey="ma90" name="90D MA" stroke="#d99a3c" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
