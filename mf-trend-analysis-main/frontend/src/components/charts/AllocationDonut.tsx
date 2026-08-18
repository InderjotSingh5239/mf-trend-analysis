import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { chartValueToNumber } from '@/lib/utils'

const PALETTE = ['#0fae72', '#2f6fed', '#d99a3c', '#e5484d', '#8b5cf6', '#64748b', '#22c98a', '#5b8bf2']

export function AllocationDonut({
  data,
  height = 240,
}: {
  data: { name: string; value: number }[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="85%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => `${chartValueToNumber(v).toFixed(1)}%`}
          contentStyle={{
            background: 'var(--color-ink-900)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'IBM Plex Mono',
          }}
        />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, fontFamily: 'Inter' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
