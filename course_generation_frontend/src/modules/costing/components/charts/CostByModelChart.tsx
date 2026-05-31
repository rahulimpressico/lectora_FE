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

interface Props {
  data: ModelUsage[]
}

export function CostByModelChart({ data }: Props) {
  const isDark = useIsDarkMode()
  const axisStyle = chartAxisStyle(isDark)

  const chartData = data.map((m) => ({
    name: m.modelName,
    modelId: m.modelId,
    cost: m.cost,
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
          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          width={52}
        />
        <Tooltip
          contentStyle={tooltipStyle(isDark)}
          formatter={(value: unknown) => [`$${(value as number).toFixed(4)}`, 'Cost']}
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
