import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Wand2, FileText, ScanText, BookOpen, Check, Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'

/**
 * Real A0 phases. UI advances by elapsed time but stays on the AI step
 * for most of the wait — that is where the server actually spends time.
 */
const STEPS = [
  {
    icon: FileText,
    label: 'Processing document',
    desc: 'Reading and parsing your uploaded DOCX file',
    untilSec: 8,
  },
  {
    icon: ScanText,
    label: 'Analysing content',
    desc: 'Detecting sections, headings, and learning objectives',
    untilSec: 20,
  },
  {
    icon: BookOpen,
    label: 'Generating Training Outline',
    desc: 'AI is classifying your course and building the outline',
    untilSec: Infinity,
  },
] as const

type StepStatus = 'pending' | 'active' | 'done'

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function activeStepIndex(elapsedSec: number): number {
  for (let i = 0; i < STEPS.length; i++) {
    if (elapsedSec < STEPS[i].untilSec) return i
  }
  return STEPS.length - 1
}

function progressPercent(elapsedSec: number): number {
  return Math.min(90, Math.round(12 + elapsedSec * 1.15))
}

interface TOGenerationLoaderProps {
  onCancel?: () => void
  /** Real-time status message from the backend — shown below the active step. */
  statusMessage?: string | null
}

export function TOGenerationLoader({ onCancel, statusMessage }: TOGenerationLoaderProps) {
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsedSec((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const activeStep = activeStepIndex(elapsedSec)
  const progress = progressPercent(elapsedSec)
  const isLongWait = elapsedSec >= 45

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="overlay-fade-in fixed inset-0 z-[100] bg-white/20 backdrop-blur-[14px] backdrop-saturate-150"
        style={{ WebkitBackdropFilter: 'blur(14px) saturate(1.5)' }}
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center px-6 py-10 overflow-y-auto pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="to-generation-title"
        aria-busy="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="relative w-full max-w-md pointer-events-auto"
        >
          {/* Top gradient line */}
          <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

          <div className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_20px_60px_-8px_rgba(99,102,241,0.2),0_6px_20px_-4px_rgba(0,0,0,0.08)] overflow-hidden">

            {/* Cancel button */}
            {onCancel && (
              <div className="absolute top-3 right-3 z-10">
                <button
                  type="button"
                  onClick={onCancel}
                  title="Cancel generation"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Header section */}
            <div className="relative flex flex-col items-center px-8 pt-10 pb-7 border-b border-slate-100/70 overflow-hidden">
              {/* Background decoration */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-white" />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.8) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Icon */}
              <div className="relative flex h-[76px] w-[76px] items-center justify-center mb-5">
                <span
                  className="absolute inset-0 rounded-full bg-indigo-300/25 animate-ping"
                  style={{ animationDuration: '2.2s' }}
                />
                <span
                  className="absolute inset-2 rounded-full bg-indigo-200/20 animate-ping"
                  style={{ animationDuration: '3s', animationDelay: '0.6s' }}
                />
                <motion.div
                  animate={{ scale: [1, 1.04, 1], rotate: [0, 2, 0, -2, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative flex h-[76px] w-[76px] items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_8px_28px_0_rgba(99,102,241,0.55)]"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/15" />
                  <Wand2 size={28} className="text-white relative" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                </motion.div>
              </div>

              <h2
                id="to-generation-title"
                className="text-lg font-bold text-slate-900 tracking-tight text-center relative"
              >
                Generating Training Outline
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 text-center leading-relaxed max-w-xs relative">
                Please wait — do not close this tab.
                <br />
                <span className="text-indigo-500 font-medium">AI agents are analyzing your content.</span>
              </p>
            </div>

            {/* Steps */}
            <div className="px-5 py-4 space-y-1.5">
              {STEPS.map((step, idx) => {
                const status: StepStatus =
                  idx < activeStep ? 'done' : idx === activeStep ? 'active' : 'pending'
                const Icon = step.icon

                return (
                  <motion.div
                    key={idx}
                    initial={false}
                    animate={{
                      opacity: status === 'pending' ? 0.35 : 1,
                    }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-500',
                      status === 'active' &&
                        'bg-indigo-50/80 ring-1 ring-indigo-100 shadow-[0_2px_8px_rgba(99,102,241,0.08)]',
                      status === 'done' && 'bg-emerald-50/50',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-400',
                        status === 'done' &&
                          'bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)]',
                        status === 'active' &&
                          'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_3px_12px_rgba(99,102,241,0.45)]',
                        status === 'pending' && 'bg-slate-100 text-slate-400',
                      )}
                    >
                      {status === 'done' ? (
                        <Check size={14} strokeWidth={2.5} />
                      ) : status === 'active' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Icon size={14} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-[13px] font-semibold leading-tight',
                          status === 'done' && 'text-emerald-700',
                          status === 'active' && 'text-indigo-700',
                          status === 'pending' && 'text-slate-500',
                        )}
                      >
                        {step.label}
                      </p>
                      <AnimatePresence>
                        {status === 'active' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="text-[11px] text-indigo-400/90 mt-0.5 leading-snug">
                              {step.desc}
                            </p>
                            {statusMessage && (
                              <p className="text-[10px] text-indigo-300 mt-0.5 leading-snug truncate" title={statusMessage}>
                                {statusMessage}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {status === 'active' && (
                      <div className="flex items-center gap-1 shrink-0">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                            style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.9s' }}
                          />
                        ))}
                      </div>
                    )}

                    {status === 'done' && (
                      <span className="text-[10px] font-bold text-emerald-600 shrink-0 tracking-wide uppercase bg-emerald-100/80 px-2 py-0.5 rounded-md">
                        Done
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Progress */}
            <div className="px-5 pb-6 pt-2">
              <div className="bg-slate-50/80 rounded-xl border border-slate-100 px-4 py-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Progress
                  </span>
                  <span className="text-[12px] font-bold text-indigo-600 tabular-nums">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <motion.div
                    initial={{ width: '12%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full progress-bar-animated"
                  />
                </div>
                <p className="mt-3 text-center text-[11px] text-slate-400 leading-relaxed">
                  Elapsed:{' '}
                  <span className="font-semibold text-slate-500 tabular-nums">
                    {formatElapsed(elapsedSec)}
                  </span>
                  {' · '}
                  Typical:{' '}
                  <span className="font-semibold text-slate-500">30s – 2 min</span>
                </p>
                <AnimatePresence>
                  {isLongWait && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 text-center text-[11px] text-amber-600/90 leading-relaxed overflow-hidden"
                    >
                      Still running — large documents can take longer. Keep this tab open.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>,
    document.body,
  )
}
