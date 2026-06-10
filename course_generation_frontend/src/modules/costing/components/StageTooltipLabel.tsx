import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { getStageTooltip } from '../utils/stageTooltips'
import { InfoTooltip } from './InfoTooltip'

interface Props {
  stageKey: string
  stageName: string
  className?: string
  labelClassName?: string
  labelStyle?: CSSProperties
}

export function StageTooltipLabel({
  stageKey,
  stageName,
  className,
  labelClassName,
  labelStyle,
}: Props) {
  const tooltip = getStageTooltip(stageKey, stageName)

  if (!tooltip) {
    return (
      <span className={cn('truncate', labelClassName)} style={labelStyle}>
        {stageName}
      </span>
    )
  }

  return (
    <InfoTooltip content={tooltip} className={cn('min-w-0', className)} showIcon>
      <span className={cn('truncate', labelClassName)} style={labelStyle}>
        {stageName}
      </span>
    </InfoTooltip>
  )
}
