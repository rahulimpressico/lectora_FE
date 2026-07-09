import type { WizardStep } from '../types/wizardLayout'

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'wizard-basics', label: 'Course Basics' },
  { id: 'wizard-audience', label: 'Audience' },
  { id: 'wizard-required-topics', label: 'Topics' },
  { id: 'wizard-materials', label: 'Materials' },
  { id: 'wizard-objectives', label: 'Objectives' },
  { id: 'wizard-direction', label: 'Direction' },
  { id: 'wizard-outline-pref', label: 'Structure' },
  { id: 'wizard-outline-review', label: 'Review' },
]

// ── Animation variants ──────────────────────────────────────────────────────

export const checkmarkVariants = {
  hidden: { scale: 0, rotate: -20, opacity: 0 },
  show: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 500, damping: 25 },
  },
}

export const completedCircleVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}
