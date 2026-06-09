import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import type { ModelUsage } from '../../types'
import { getModelColor, useIsDarkMode, tooltipStyle } from './chartTheme'
import { sortModelsByCost } from './chartHelpers'
import { ChartEmptyState } from './ChartEmptyState'

interface Props {
  data: ModelUsage[]
}

export function CostDistributionChart({ data }: Props) {
  const isDark = useIsDarkMode()
  const sorted = sortModelsByCost(data).filter((m) => m.cost > 0)

  if (sorted.length === 0) {
    return <ChartEmptyState message="No model cost data yet" height={240} />
  }

  const total = sorted.reduce((s, m) => s + m.cost, 0)
  const chartData = sorted.map((m) => ({
    name: m.modelName,
    modelId: m.modelId,
    value: m.cost,
    pct: total > 0 ? ((m.cost / total) * 100).toFixed(1) : '0',
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
