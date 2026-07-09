import type { ReactNode } from 'react'
import type { WizardData } from '../../../../types/wizard'

export interface ExperienceCard {
  value: WizardData['experienceLevel']
  label: string
  description: string
  icon: ReactNode
}
