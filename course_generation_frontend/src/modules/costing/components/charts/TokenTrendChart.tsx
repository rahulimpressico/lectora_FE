import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { CostingTrendPoint } from '../../types'
import { useIsDarkMode, chartAxisStyle, chartGridColor, tooltipStyle } from './chartTheme'
import { formatTrendDate, formatTrendDateFull, getTrendTickStep, hasTrendData } from './chartHelpers'
import { ChartEmptyState } from './ChartEmptyState'

interface Props {
  data: CostingTrendPoint[]
}

function fmtTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

export function TokenTrendChart({ data }: Props) {
  const isDark = useIsDarkMode()
  const axisStyle = chartAxisStyle(isDark)

  if (!hasTrendData(data)) {
    return <ChartEmptyState message="No daily token trend yet — run a course or TO job first" height={240} />
  }

  const tickStep = getTrendTickStep(data.length)
  const tickFormatter = (value: string, index: number) =>
    index % tickStep === 0 || index === data.length - 1 ? formatTrendDate(value) : ''

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="inputGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="outputGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor(isDark)} vertical={false} />
        <XAxis
          dataKey="date"
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          tickFormatter={tickFormatter}
          minTickGap={12}
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
          labelFormatter={(label: unknown) => formatTrendDateFull(String(label))}
          formatter={(value: unknown, name: unknown) => [fmtTokens(value as number), name as string]}
        />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }} />
        <Area
          type="monotone"
          dataKey="inputTokens"
          name="Input Tokens"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#inputGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="outputTokens"
          name="Output Tokens"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#outputGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
