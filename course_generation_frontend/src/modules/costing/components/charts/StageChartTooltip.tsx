import { getStageTooltip } from '../../utils/stageTooltips'
import { useIsDarkMode, tooltipStyle } from './chartTheme'

type StagePayload = {
  fullLabel?: string
  stageKey?: string
  cost?: number
  requests?: number
  description?: string
}

type TooltipEntry = {
  payload?: StagePayload
  value?: number
  name?: string
}

type ChartTooltipProps = {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}

function fmtTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

export function StageCostChartTooltip({ active, payload }: ChartTooltipProps) {
  const isDark = useIsDarkMode()
  if (!active || !payload?.length) return null

  const row = payload[0].payload
  const stageName = row?.fullLabel ?? 'Stage'
  const description =
    row?.description ?? getStageTooltip(row?.stageKey ?? '', stageName)
  const cost = row?.cost ?? payload[0].value ?? 0
  const requests = row?.requests ?? 0

  return (
    <div
      style={tooltipStyle(isDark)}
      className="max-w-xs rounded-xl border px-3 py-2.5 shadow-lg"
    >
      <p className="text-xs font-semibold text-slate-800">{stageName}</p>
      {description && (
        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{description}</p>
      )}
      <p className="mt-2 text-[11px] font-semibold tabular-nums text-slate-700">
        ${cost.toFixed(4)}
        {requests > 0 && (
          <span className="ml-1.5 font-medium text-slate-400">
            · {requests} request{requests === 1 ? '' : 's'}
          </span>
        )}
      </p>
    </div>
  )
}

export function StageTokenChartTooltip({ active, payload, label }: ChartTooltipProps) {
  const isDark = useIsDarkMode()
  if (!active || !payload?.length) return null

  const row = payload[0].payload
  const stageName = row?.fullLabel ?? (typeof label === 'string' ? label : 'Stage')
  const description =
    row?.description ?? getStageTooltip(row?.stageKey ?? '', stageName)

  return (
    <div
      style={tooltipStyle(isDark)}
      className="max-w-xs rounded-xl border px-3 py-2.5 shadow-lg"
    >
      <p className="text-xs font-semibold text-slate-800">{stageName}</p>
      {description && (
        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{description}</p>
      )}
      <div className="mt-2 space-y-0.5">
        {payload.map((entry) => (
          <p key={String(entry.name)} className="text-[11px] tabular-nums text-slate-600">
            <span className="font-medium text-slate-700">{entry.name}:</span>{' '}
            {fmtTokens(entry.value ?? 0)}
          </p>
        ))}
      </div>
    </div>
  )
}
