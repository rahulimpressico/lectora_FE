import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { CostingTrendPoint } from '../../types'
import { useIsDarkMode, chartAxisStyle, chartGridColor, tooltipStyle } from './chartTheme'
import { formatTrendDate, formatTrendDateFull, getTrendTickStep, hasTrendData } from './chartHelpers'
import { ChartEmptyState } from './ChartEmptyState'

interface Props {
  data: CostingTrendPoint[]
}

export function CostTrendChart({ data }: Props) {
  const isDark = useIsDarkMode()
  const axisStyle = chartAxisStyle(isDark)

  if (!hasTrendData(data)) {
    return <ChartEmptyState message="No daily cost trend yet — run a course or TO job first" height={240} />
  }

  const tickStep = getTrendTickStep(data.length)
  const tickFormatter = (value: string, index: number) =>
    index % tickStep === 0 || index === data.length - 1 ? formatTrendDate(value) : ''

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
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
          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          width={52}
        />
        <Tooltip
          contentStyle={tooltipStyle(isDark)}
          labelFormatter={(label: unknown) => formatTrendDateFull(String(label))}
          formatter={(value: unknown) => [`$${(value as number).toFixed(4)}`, 'Cost']}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#costGradient)"
          dot={data.length <= 14}
          activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
