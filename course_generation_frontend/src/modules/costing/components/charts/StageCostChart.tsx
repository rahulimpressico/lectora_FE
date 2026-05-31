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
import type { StageBreakdown } from '../../types'
import { getStageColor, useIsDarkMode, chartAxisStyle, chartGridColor, tooltipStyle } from './chartTheme'

interface Props {
  data: StageBreakdown[]
}

export function StageCostChart({ data }: Props) {
  const isDark = useIsDarkMode()
  const axisStyle = chartAxisStyle(isDark)

  const chartData = data.map((s) => ({
    name: s.stageName.replace(' Generation', '\nGen').replace(' Operations', '\nOps'),
    stageKey: s.stageKey,
    cost: s.cost,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barSize={32} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
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
          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          width={52}
        />
        <Tooltip
          contentStyle={tooltipStyle(isDark)}
          formatter={(value: unknown) => [`$${(value as number).toFixed(4)}`, 'Cost']}
          cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
        />
        <Bar dataKey="cost" radius={[5, 5, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.stageKey} fill={getStageColor(entry.stageKey)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
