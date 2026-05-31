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
import type { ModelUsage } from '../../types'
import {
  useIsDarkMode,
  chartAxisStyle,
  chartGridColor,
  tooltipStyle,
} from './chartTheme'

interface Props {
  data: ModelUsage[]
}

function fmtTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

export function TokenStackedChart({ data }: Props) {
  const isDark = useIsDarkMode()
  const axisStyle = chartAxisStyle(isDark)

  const chartData = data.map((m) => ({
    name: m.modelName,
    'Input Tokens': m.inputTokens,
    'Output Tokens': m.outputTokens,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} barSize={36} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={chartGridColor(isDark)}
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
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
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
        />
        <Bar dataKey="Input Tokens" stackId="tokens" fill="#6366f1" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Output Tokens" stackId="tokens" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
