import type { ReactNode } from 'react'
import { useState, useMemo, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react'
import { useCourseStore } from '../../../store/courseStore'
import { cn } from '@/lib/cn'
import type { WorkflowPhase } from '../../../types'
import { WizardNavContext } from './WizardNavContext'
import type { WizardNavConfig } from './WizardNavContext'
import { CoursePreviewPanel } from './CoursePreviewPanel'

interface WizardStep {
  id: WorkflowPhase
  label: string
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'wizard-basics', label: 'Course Basics' },
  { id: 'wizard-audience', label: 'Audience' },
  { id: 'wizard-materials', label: 'Materials' },
  { id: 'wizard-objectives', label: 'Objectives' },
  { id: 'wizard-direction', label: 'Direction' },
  { id: 'wizard-outline-pref', label: 'Outline' },
  { id: 'wizard-outline-review', label: 'Review' },
]

// ── Animation variants ──────────────────────────────────────────────────────

const checkmarkVariants = {
  hidden: { scale: 0, rotate: -20, opacity: 0 },
  show: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 500, damping: 25 },
  },
}

const completedCircleVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

export const WizardLayout = ({ children }: { children: ReactNode }) => {
  const phase = useCourseStore((s) => s.phase)
  const setPhase = useCourseStore((s) => s.setPhase)
  const reset    = useCourseStore((s) => s.reset)
  const [navConfig, setNavConfig] = useState<WizardNavConfig>({})

  const setConfig = useCallback((cfg: WizardNavConfig) => setNavConfig(cfg), [])
  const ctxValue = useMemo(() => ({ config: navConfig, setConfig }), [navConfig, setConfig])

  const [confirmRestart, setConfirmRestart] = useState(false)

  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === phase)
  const safeIndex = currentIndex === -1 ? 0 : currentIndex
  const currentStep = WIZARD_STEPS[safeIndex]

  // Track slide direction synchronously during render (ref avoids 1-frame lag from useState)
  const prevIndexRef = useRef(safeIndex)
  const directionRef = useRef(0)
  if (prevIndexRef.current !== safeIndex) {
    directionRef.current = safeIndex > prevIndexRef.current ? 1 : -1
    prevIndexRef.current = safeIndex
  }

  // Page-slide variants: forward slides left↔right, backward reverses
  const pageVariants = {
    enter: (dir: number) => ({
      x: dir * 60,
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir * -60,
      opacity: 0,
      scale: 0.96,
    }),
  }

  const pageTransition = {
    x: { type: 'spring' as const, stiffness: 380, damping: 40, mass: 0.9 },
    opacity: { duration: 0.25, ease: 'easeOut' as const },
    scale: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }

  const handleBack = () => {
    if (!navConfig.backPhase) return
    if (navConfig.backPhase === 'welcome') {
      reset() // reset() already sets phase → 'welcome'; clears all wizard state
    } else {
      setPhase(navConfig.backPhase)
    }
  }

  const handleNext = () => {
    if (navConfig.onNext) {
      navConfig.onNext()
    } else if (navConfig.nextPhase) {
      setPhase(navConfig.nextPhase)
    }
  }

  return (
    <WizardNavContext.Provider value={ctxValue}>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white">

        {/* ── Premium stepper header ── */}
        <div className="relative flex-none bg-white border-b border-slate-100 z-10">

          {/* Start Over — absolute top-right corner */}
          <div className="absolute top-3 right-4 z-20 flex items-center gap-1.5">
            {confirmRestart ? (
              <>
                <span className="text-xs text-slate-500 font-medium">Reset all?</span>
                <button
                  type="button"
                  onClick={() => { setConfirmRestart(false); reset() }}
                  className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRestart(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors"
                >
                  No
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRestart(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-colors"
                title="Start over"
              >
                <RotateCcw className="w-3 h-3" />
                Start Over
              </button>
            )}
          </div>

          {/* Desktop: horizontal step circles */}
          <div className="hidden sm:block">
            <div className="max-w-4xl mx-auto px-6 py-5">
              <div className="flex items-start">
                {WIZARD_STEPS.map((step, index) => {
                  const isCompleted = index < safeIndex
                  const isActive = index === safeIndex
                  return (
                    <div key={step.id} className="flex items-start flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-2 min-w-0">
                        {isCompleted ? (
                          <motion.button
                            type="button"
                            onClick={() => setPhase(step.id as WorkflowPhase)}
                            title={`Return to ${step.label}`}
                            variants={completedCircleVariants}
                            initial="hidden"
                            animate="show"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.93 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            style={{ willChange: 'transform' }}
                            className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200/60 hover:bg-indigo-700 cursor-pointer"
                          >
                            <motion.span
                              variants={checkmarkVariants}
                              initial="hidden"
                              animate="show"
                              style={{ willChange: 'transform', display: 'flex' }}
                            >
                              <Check className="w-4 h-4" strokeWidth={2.5} />
                            </motion.span>
                          </motion.button>
                        ) : isActive ? (
                          <motion.div
                            animate={{
                              boxShadow: [
                                '0 0 0 0px rgba(99,102,241,0.3)',
                                '0 0 0 6px rgba(99,102,241,0)',
                              ],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                            style={{ willChange: 'box-shadow', borderRadius: '9999px' }}
                          >
                            <div className={cn(
                              'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200',
                              'bg-white text-indigo-600 ring-2 ring-indigo-500 ring-offset-2 shadow-lg shadow-indigo-100/80',
                            )}>
                              {index + 1}
                            </div>
                          </motion.div>
                        ) : (
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200',
                            'bg-slate-100 text-slate-400',
                          )}>
                            {index + 1}
                          </div>
                        )}
                        <span className={cn(
                          'text-[10px] font-semibold tracking-wide whitespace-nowrap',
                          isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-500' : 'text-slate-300',
                        )}>
                          {step.label}
                        </span>
                      </div>
                      {index < WIZARD_STEPS.length - 1 && (
                        <div className={cn(
                          'flex-1 h-px mt-[18px] mx-3 transition-colors duration-500',
                          index < safeIndex ? 'bg-indigo-400' : 'bg-slate-200',
                        )} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Mobile: compact step indicator */}
          <div className="sm:hidden px-4 py-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">
                Step {safeIndex + 1} of {WIZARD_STEPS.length}
              </span>
              <span className="text-[11px] font-semibold text-slate-700 pr-24">{currentStep?.label}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${((safeIndex + 1) / WIZARD_STEPS.length) * 100}%`,
                  willChange: 'width',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Two-column body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left: step content + footer */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Scrollable step content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-white">
              <AnimatePresence mode="wait" custom={directionRef.current} initial={false}>
                <motion.div
                  key={phase}
                  custom={directionRef.current}
                  variants={pageVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={pageTransition}
                  style={{ willChange: 'transform, opacity' }}
                  className="w-full px-7 sm:px-10 py-8 sm:py-10 max-w-2xl"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer nav — scoped to left column */}
            <div className="flex-none bg-white border-t border-slate-100 shadow-[0_-1px_8px_rgba(0,0,0,0.04)] z-10">
              <div className="w-full px-7 sm:px-10 py-3.5 max-w-2xl">
                <div className="flex items-center justify-between gap-4">
                  {/* Back button */}
                  {navConfig.backPhase ? (
                    <motion.button
                      type="button"
                      onClick={handleBack}
                      whileHover={{ x: -2 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      style={{ willChange: 'transform' }}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-500 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-colors duration-150"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {navConfig.backLabel ?? 'Back'}
                    </motion.button>
                  ) : (
                    <div />
                  )}

                  {/* Next / action button */}
                  <motion.button
                    type="button"
                    onClick={handleNext}
                    disabled={navConfig.isNextDisabled || navConfig.isNextLoading}
                    whileHover={
                      navConfig.isNextDisabled || navConfig.isNextLoading
                        ? undefined
                        : { y: -1, scale: 1.02 }
                    }
                    whileTap={
                      navConfig.isNextDisabled || navConfig.isNextLoading
                        ? undefined
                        : { scale: 0.97 }
                    }
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    style={{ willChange: 'transform' }}
                    className={cn(
                      'flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-150',
                      'bg-indigo-600 text-white shadow-sm shadow-indigo-200/60',
                      'hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-200/60',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                    )}
                  >
                    {navConfig.isNextLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating…</span>
                      </>
                    ) : (
                      <>
                        <span>{navConfig.nextLabel ?? 'Next'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: live course preview (lg+ only) */}
          <aside className="hidden lg:flex lg:flex-col lg:w-[46%] flex-none border-l border-slate-100 overflow-hidden bg-white">
            <CoursePreviewPanel />
          </aside>

        </div>
      </div>
    </WizardNavContext.Provider>
  )
}
