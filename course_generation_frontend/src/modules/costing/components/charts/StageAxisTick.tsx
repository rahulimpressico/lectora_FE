type StageAxisEntry = {
  shortLabel: string
  fullLabel: string
  description?: string
}

type AxisTickStyle = {
  fill: string
  fontFamily: string
}

type TickProps = {
  x?: string | number
  y?: string | number
  payload?: { value?: string }
}

export function createStageAxisTick(
  chartData: StageAxisEntry[],
  axisStyle: AxisTickStyle,
) {
  return function StageAxisTick(props: TickProps) {
    const x = Number(props.x ?? 0)
    const y = Number(props.y ?? 0)
    const payload = props.payload
    const entry = chartData.find((d) => d.shortLabel === payload?.value)
    const hint = entry?.description ?? entry?.fullLabel ?? payload?.value ?? ''

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={-4}
          y={0}
          dy={4}
          textAnchor="end"
          fill={axisStyle.fill}
          fontSize={11}
          fontFamily={axisStyle.fontFamily}
        >
          <title>{hint}</title>
          {payload?.value}
        </text>
      </g>
    )
  }
}
