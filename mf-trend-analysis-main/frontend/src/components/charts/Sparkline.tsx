import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import type { NavPoint } from '@/types/fund'

export function Sparkline({ data, positive = true, height = 44 }: { data: NavPoint[]; positive?: boolean; height?: number }) {
  const color = positive ? '#0fae72' : '#e5484d'
  const gradientId = `spark-${positive ? 'up' : 'down'}-${height}`
  // sample down for perf
  const step = Math.max(1, Math.floor(data.length / 60))
  const sampled = data.filter((_, i) => i % step === 0)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={sampled} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="nav" stroke={color} strokeWidth={1.75} fill={`url(#${gradientId})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
