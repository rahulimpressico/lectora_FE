import type { ReactNode } from 'react'
import type { WizardData } from '../../../../types/wizard'

export interface DepthCard {
  value: WizardData['depth']
  label: string
  description: string
  icon: ReactNode
}

export interface ToggleSwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
}

export interface DepthCardButtonProps {
  card: DepthCard
  isSelected: boolean
  onSelect: () => void
}
