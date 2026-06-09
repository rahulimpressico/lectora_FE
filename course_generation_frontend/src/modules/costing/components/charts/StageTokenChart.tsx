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
import { getStageChartLabel, sortStagesByCost, stageChartHeight } from './chartHelpers'
import { ChartEmptyState } from './ChartEmptyState'

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
  const sorted = sortStagesByCost(data).filter(
    (s) => s.inputTokens > 0 || s.outputTokens > 0,
  )

  if (sorted.length === 0) {
    return <ChartEmptyState message="No stage-level token usage recorded yet" />
  }

  const chartData = sorted.map((s) => ({
    shortLabel: getStageChartLabel(s.stageKey, s.stageName),
    fullLabel: s.stageName,
    'Input Tokens': s.inputTokens,
    'Output Tokens': s.outputTokens,
  }))

  const height = stageChartHeight(chartData.length)

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
          tickFormatter={fmtTokens}
        />
        <YAxis
          type="category"
          dataKey="shortLabel"
          tick={{ ...axisStyle, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={92}
        />
        <Tooltip
          contentStyle={tooltipStyle(isDark)}
          labelFormatter={(_label, payload) =>
            (payload?.[0]?.payload as { fullLabel?: string } | undefined)?.fullLabel ?? _label
          }
          formatter={(value: unknown, name: unknown) => [fmtTokens(value as number), name as string]}
          cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }} />
        <Bar dataKey="Input Tokens" stackId="t" fill="#6366f1" barSize={18} />
        <Bar dataKey="Output Tokens" stackId="t" fill="#8b5cf6" radius={[0, 5, 5, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
