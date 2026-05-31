import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import type { ModelUsage } from '../../types'
import { getModelColor, useIsDarkMode, tooltipStyle } from './chartTheme'

interface Props {
  data: ModelUsage[]
}

export function CostDistributionChart({ data }: Props) {
  const isDark = useIsDarkMode()

  const chartData = data.map((m) => ({
    name: m.modelName,
    modelId: m.modelId,
    value: m.cost,
    pct: ((m.cost / data.reduce((s, x) => s + x.cost, 0)) * 100).toFixed(1),
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {chartData.map((entry) => (
            <Cell key={entry.modelId} fill={getModelColor(entry.modelId)} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle(isDark)}
          formatter={(value: unknown, name: unknown, props: { payload?: { pct?: string } }) => [
            `$${(value as number).toFixed(4)} (${props.payload?.pct ?? ''}%)`,
            name as string,
          ]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
          formatter={(value) => (
            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
