import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type { ModelUsage } from '../../types'
import {
  getModelColor,
  useIsDarkMode,
  chartAxisStyle,
  chartGridColor,
  tooltipStyle,
} from './chartTheme'
import { sortModelsByCost } from './chartHelpers'
import { ChartEmptyState } from './ChartEmptyState'

interface Props {
  data: ModelUsage[]
}

export function CostByModelChart({ data }: Props) {
  const isDark = useIsDarkMode()
  const axisStyle = chartAxisStyle(isDark)
  const sorted = sortModelsByCost(data).filter((m) => m.cost > 0)

  if (sorted.length === 0) {
    return <ChartEmptyState message="No model cost data yet" height={240} />
  }

  const chartData = sorted.map((m) => ({
    name: m.modelName,
    modelId: m.modelId,
    cost: m.cost,
    requests: m.totalRequests,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} barSize={36} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor(isDark)} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ ...axisStyle, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={sorted.length > 3 ? -18 : 0}
          textAnchor={sorted.length > 3 ? 'end' : 'middle'}
          height={sorted.length > 3 ? 56 : 32}
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
          formatter={(value: unknown, _name: unknown, item: { payload?: { requests?: number } }) => {
            const requests = item.payload?.requests ?? 0
            return [
              `$${(value as number).toFixed(4)} · ${requests} request${requests === 1 ? '' : 's'}`,
              'Cost',
            ]
          }}
          cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
        />
        <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.modelId} fill={getModelColor(entry.modelId)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
