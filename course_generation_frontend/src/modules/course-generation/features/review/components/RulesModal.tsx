import { useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useCourseStore } from '../../onboarding-flow/store'
import { deepSet } from '../../../utils/deepUpdate'
import { STEP_DEFS } from './rules-wizard/constants'
import { RuleStepBar } from './rules-wizard/RuleStepBar'
import { OverviewRuleStep } from './rules-wizard/steps/OverviewRuleStep'
import { SectionRuleStep } from './rules-wizard/steps/SectionRuleStep'
import type { JsonObject, JsonValue } from '../../../types'

interface RulesModalProps {
  onClose: () => void
}

export function RulesModal({ onClose }: RulesModalProps) {
  const { rulesData, rulesOriginal, setRulesData } = useCourseStore()

  const [localRules, setLocalRules] = useState<JsonObject>(() =>
    JSON.parse(JSON.stringify(rulesData ?? {})) as JsonObject,
  )

  const [currentStep, setCurrentStep] = useState(0)

  // Build the list of active steps: always include overview; only include a
  // section step when a matching key with object data exists in the rule pack.
  const activeSteps = useMemo(() => {
    return STEP_DEFS.filter((def) => {
      if (def.candidates === null) return true   // overview always shown
      return def.candidates.some((c) => {
        const val = localRules[c]
        return typeof val === 'object' && val !== null && !Array.isArray(val)
      })
    })
  }, [localRules])

  // For each non-overview step, resolve which top-level key matched.
  const resolveKey = useCallback(
    (stepId: string): string | null => {
      const def = STEP_DEFS.find((d) => d.id === stepId)
      if (!def || def.candidates === null) return null
      return def.candidates.find((c) => {
        const val = localRules[c]
        return typeof val === 'object' && val !== null && !Array.isArray(val)
      }) ?? null
    },
    [localRules],
  )

  const isFirstStep = currentStep === 0
  const isLastStep  = currentStep === activeSteps.length - 1

  const handleFieldChange = useCallback((path: string[], value: JsonValue) => {
    setLocalRules((prev) => deepSet(prev, path, value))
  }, [])

  const handleNext = useCallback(() => {
    if (isLastStep) {
      setRulesData(localRules, rulesOriginal ?? localRules)
      onClose()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }, [isLastStep, localRules, rulesOriginal, setRulesData, onClose])

  const handleBack = useCallback(() => {
    if (isFirstStep) {
      onClose()
    } else {
      setCurrentStep((s) => s - 1)
    }
  }, [isFirstStep, onClose])

  if (!rulesData) return null

  const currentStepDef = activeSteps[currentStep]

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Edit Rules &amp; Requirements</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and update compliance rules before generating the course.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Step bar */}
        <RuleStepBar steps={activeSteps} current={currentStep} />

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {/* Step heading */}
          <div className="flex items-start gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
              <currentStepDef.Icon size={17} className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{currentStepDef.label}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {currentStepDef.description}
              </p>
            </div>
          </div>

          {/* Per-step content */}
          {currentStepDef.id === 'overview' ? (
            <OverviewRuleStep localRules={localRules} onChange={handleFieldChange} />
          ) : (() => {
            const sectionKey = resolveKey(currentStepDef.id)
            if (!sectionKey) return (
              <p className="text-sm text-slate-400 italic text-center py-8">
                No data found for this section in the current rule pack.
              </p>
            )
            return (
              <SectionRuleStep
                sectionKey={sectionKey}
                data={localRules[sectionKey] as JsonObject}
                onChange={handleFieldChange}
              />
            )
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/80 rounded-b-2xl">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={14} />
            {isFirstStep ? 'Cancel' : 'Back'}
          </button>

          {/* Dot progress indicators */}
          <div className="flex items-center gap-2">
            {activeSteps.map((_, i) => (
              <div
                key={i}
                className={[
                  'h-1.5 rounded-full transition-all',
                  i === currentStep
                    ? 'w-4 bg-violet-500'
                    : i < currentStep
                      ? 'w-1.5 bg-emerald-400'
                      : 'w-1.5 bg-slate-200',
                ].join(' ')}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className={[
              'flex items-center gap-1.5 h-9 px-5 rounded-lg text-sm font-semibold text-white transition-all',
              isLastStep
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 shadow-[0_2px_8px_0_rgb(16,185,129,0.35)]'
                : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-[0_2px_8px_0_rgb(139,92,246,0.35)]',
            ].join(' ')}
          >
            {isLastStep ? (
              <><Check size={14} />Save Changes</>
            ) : (
              <>Next<ChevronRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
