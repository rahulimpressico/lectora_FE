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
