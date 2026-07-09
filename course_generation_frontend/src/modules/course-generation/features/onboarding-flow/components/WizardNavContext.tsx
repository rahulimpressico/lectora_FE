import { createContext, useContext } from 'react'
import type { WizardNavConfig } from '../types/wizardNav'

export type { WizardNavConfig }

interface WizardNavContextValue {
  config: WizardNavConfig
  setConfig: (config: WizardNavConfig) => void
}

export const WizardNavContext = createContext<WizardNavContextValue>({
  config: {},
  setConfig: () => {},
})

export const useWizardNav = () => useContext(WizardNavContext)
