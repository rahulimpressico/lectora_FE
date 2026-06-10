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
import { getStageTooltip } from '../../utils/stageTooltips'
import { getStageColor, useIsDarkMode, chartAxisStyle, chartGridColor } from './chartTheme'
import { getStageChartLabel, sortStagesByCost, stageChartHeight } from './chartHelpers'
import { ChartEmptyState } from './ChartEmptyState'
import { createStageAxisTick } from './StageAxisTick'
import { StageCostChartTooltip } from './StageChartTooltip'

interface Props {
  data: StageBreakdown[]
}

export function StageCostChart({ data }: Props) {
  const isDark = useIsDarkMode()
  const axisStyle = chartAxisStyle(isDark)
  const sorted = sortStagesByCost(data).filter((s) => s.cost > 0)

  if (sorted.length === 0) {
    return <ChartEmptyState message="No stage-level cost recorded yet" />
  }

  const chartData = sorted.map((s) => ({
    shortLabel: getStageChartLabel(s.stageKey, s.stageName),
    fullLabel: s.stageName,
    stageKey: s.stageKey,
    description: getStageTooltip(s.stageKey, s.stageName),
    cost: s.cost,
    requests: s.requests,
  }))

  const height = stageChartHeight(chartData.length)
  const stageAxisTick = createStageAxisTick(chartData, axisStyle)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor(isDark)} horizontal={false} />
        <XAxis
          type="number"
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
        />
        <YAxis
          type="category"
          dataKey="shortLabel"
          tick={stageAxisTick}
          axisLine={false}
          tickLine={false}
          width={92}
        />
        <Tooltip
          content={<StageCostChartTooltip />}
          cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
        />
        <Bar dataKey="cost" barSize={18} radius={[0, 5, 5, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.stageKey} fill={getStageColor(entry.stageKey)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
