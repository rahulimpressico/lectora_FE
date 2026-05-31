import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { StageBreakdown } from '../../types'
import { useIsDarkMode, chartAxisStyle, chartGridColor, tooltipStyle } from './chartTheme'

interface Props {
  data: StageBreakdown[]
}

function fmtTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

export function StageTokenChart({ data }: Props) {
  const isDark = useIsDarkMode()
  const axisStyle = chartAxisStyle(isDark)

  const chartData = data.map((s) => ({
    name: s.stageName.replace(' Generation', '\nGen').replace(' Operations', '\nOps'),
    'Input Tokens': s.inputTokens,
    'Output Tokens': s.outputTokens,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barSize={28} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor(isDark)} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ ...axisStyle, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmtTokens}
          width={48}
        />
        <Tooltip
          contentStyle={tooltipStyle(isDark)}
          formatter={(value: unknown, name: unknown) => [fmtTokens(value as number), name as string]}
          cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }} />
        <Bar dataKey="Input Tokens" stackId="t" fill="#6366f1" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Output Tokens" stackId="t" fill="#8b5cf6" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
