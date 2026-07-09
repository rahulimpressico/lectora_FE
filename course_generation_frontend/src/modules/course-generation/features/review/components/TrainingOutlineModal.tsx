import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useCourseStore } from '../../onboarding-flow/store'
import { selectEffectiveTO } from '../../onboarding-flow/store/selectors'
import { deepSet } from '../../../utils/deepUpdate'
import { STEPS } from './training-outline/constants'
import { detectKey, getStr } from './training-outline/helpers'
import { StepBar } from './training-outline/StepBar'
import { OverviewStep } from './training-outline/steps/OverviewStep'
import { ObjectivesStep } from './training-outline/steps/ObjectivesStep'
import { SectionsStep } from './training-outline/steps/SectionsStep'
import type { JsonObject, JsonValue } from '../../../types'

interface TrainingOutlineModalProps {
  onClose: () => void
}

export const TrainingOutlineModal = ({ onClose }: TrainingOutlineModalProps) => {
  const {
    toData,
    updatedToData,
    applyTODraft,
    difficultyLevel,
    setDifficultyLevel,
    courseTypeHint,
  } = useCourseStore()
  const effectiveTO = selectEffectiveTO({ toData, updatedToData })

  const [currentStep, setCurrentStep] = useState(0)

  const [localTO, setLocalTO] = useState<JsonObject>(() => {
    const copy = JSON.parse(JSON.stringify(effectiveTO ?? {})) as JsonObject
    const hasDiffKey = 'difficulty' in copy || 'difficulty_level' in copy
    if (!hasDiffKey && difficultyLevel) copy.difficulty = difficultyLevel
    if (courseTypeHint.trim()) copy.course_type = courseTypeHint.trim()
    delete copy.topic
    delete copy.category
    return copy
  })

  const isLastStep  = currentStep === STEPS.length - 1
  const isFirstStep = currentStep === 0

  const handleFieldChange = useCallback(
    (path: string[], value: JsonValue) => {
      setLocalTO((prev) => deepSet(prev, path, value))
    },
    [],
  )

  const handleObjectivesUpdate = useCallback(
    (key: string, objectives: string[]) => {
      setLocalTO((prev) => ({ ...prev, [key]: objectives }))
    },
    [],
  )

  const handleNext = useCallback(() => {
    if (isLastStep) {
      applyTODraft(localTO)

      const diffKey = detectKey(localTO, 'difficulty', 'difficulty_level')
      const diffVal = getStr(localTO, diffKey)
      if (diffVal) setDifficultyLevel(diffVal)

      onClose()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }, [isLastStep, localTO, applyTODraft, setDifficultyLevel, onClose])

  const handleBack = useCallback(() => {
    if (isFirstStep) {
      onClose()
    } else {
      setCurrentStep((s) => s - 1)
    }
  }, [isFirstStep, onClose])

  if (!effectiveTO) return null

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
            <h2 className="text-base font-bold text-slate-900">Edit Training Outline</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and update your training outline before generating the course.
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

        <StepBar current={currentStep} />

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {currentStep === 0 && (
            <OverviewStep localTO={localTO} onChange={handleFieldChange} />
          )}
          {currentStep === 1 && (
            <ObjectivesStep localTO={localTO} onUpdate={handleObjectivesUpdate} />
          )}
          {currentStep === 2 && (
            <SectionsStep localTO={localTO} onChange={handleFieldChange} />
          )}
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
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={[
                  'h-1.5 rounded-full transition-all',
                  i === currentStep
                    ? 'w-4 bg-indigo-500'
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
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-[0_2px_8px_0_rgb(99,102,241,0.35)]',
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
