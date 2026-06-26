import { createContext, useContext } from 'react'
import type { WorkflowPhase } from '../../../types'

export interface WizardNavConfig {
  backPhase?: WorkflowPhase
  backLabel?: string
  nextLabel?: string
  isNextDisabled?: boolean
  isNextLoading?: boolean
  loadingLabel?: string
  onNext?: () => void
  nextPhase?: WorkflowPhase
}

interface WizardNavContextValue {
  config: WizardNavConfig
  setConfig: (config: WizardNavConfig) => void
}

export const WizardNavContext = createContext<WizardNavContextValue>({
  config: {},
  setConfig: () => {},
})

export const useWizardNav = () => useContext(WizardNavContext)
