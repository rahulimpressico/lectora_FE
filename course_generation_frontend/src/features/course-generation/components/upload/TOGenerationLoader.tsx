import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Wand2, FileText, ScanText, BookOpen, Check, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Real A0 phases — no fake "Finalising" step.
 * UI advances by elapsed time but stays on the AI step for most of the wait
 * (that is where the server actually spends time).
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
    desc: 'AI is classifying your course and building the outline (parallel on server)',
    untilSec: Infinity,
  },
] as const

type StepStatus = 'pending' | 'active' | 'done'

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

/** Active step from elapsed time — never shows a fake "finalising" phase. */
function activeStepIndex(elapsedSec: number): number {
  for (let i = 0; i < STEPS.length; i++) {
    if (elapsedSec < STEPS[i].untilSec) return i
  }
  return STEPS.length - 1
}

/** Smooth progress toward 90% while waiting; hits 100% only when dialog unmounts (API done). */
function progressPercent(elapsedSec: number): number {
  return Math.min(90, Math.round(12 + elapsedSec * 1.15))
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TOGenerationLoader() {
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
      <div
        aria-hidden="true"
        className="overlay-fade-in fixed inset-0 z-[100] bg-white/15 backdrop-blur-[12px] backdrop-saturate-150"
        style={{ WebkitBackdropFilter: 'blur(12px) saturate(1.5)' }}
      />

      <div
        className="fixed inset-0 z-[101] flex items-center justify-center px-6 py-10 overflow-y-auto pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="to-generation-title"
        aria-busy="true"
      >
        <div className="relative w-full max-w-md scale-in pointer-events-auto">
          <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_48px_-8px_rgba(99,102,241,0.18),0_4px_16px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="relative flex flex-col items-center px-8 pt-10 pb-7 bg-gradient-to-b from-indigo-50/60 to-white border-b border-slate-100">
              <div className="relative flex h-[72px] w-[72px] items-center justify-center mb-5">
                <span
                  className="absolute inset-0 rounded-full bg-indigo-300/30 animate-ping"
                  style={{ animationDuration: '2.2s' }}
                />
                <span
                  className="absolute inset-2 rounded-full bg-indigo-200/20 animate-ping"
                  style={{ animationDuration: '3s', animationDelay: '0.6s' }}
                />
                <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_6px_24px_0_rgba(99,102,241,0.5)]">
                  <Wand2 size={28} className="text-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }} />
                </div>
              </div>

              <h2
                id="to-generation-title"
                className="text-[17px] font-bold text-slate-900 tracking-tight text-center"
              >
                Generating Training Outline
              </h2>
              <p className="mt-1.5 text-[13px] text-slate-500 text-center leading-relaxed max-w-xs">
                Please wait — do not close this tab. The server is still running A0.
              </p>
            </div>

            <div className="px-5 py-5 space-y-1.5">
              {STEPS.map((step, idx) => {
                const status: StepStatus =
                  idx < activeStep ? 'done' : idx === activeStep ? 'active' : 'pending'
                const Icon = step.icon

                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all duration-500',
                      status === 'active' && 'bg-indigo-50/90 ring-1 ring-indigo-100/80 shadow-sm',
                      status === 'done'   && 'bg-emerald-50/60',
                      status === 'pending' && 'opacity-35',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-400',
                        status === 'done'    && 'bg-emerald-500 text-white shadow-sm',
                        status === 'active'  && 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_2px_10px_0_rgba(99,102,241,0.45)]',
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
                          status === 'done'    && 'text-emerald-700',
                          status === 'active'  && 'text-indigo-700',
                          status === 'pending' && 'text-slate-500',
                        )}
                      >
                        {step.label}
                      </p>
                      {status === 'active' && (
                        <p className="text-[11px] text-indigo-400/90 mt-0.5 fade-in leading-snug">
                          {step.desc}
                        </p>
                      )}
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
                      <span className="text-[10px] font-bold text-emerald-600 shrink-0 tracking-wide">
                        Done
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="px-5 pb-6 pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Progress
                </span>
                <span className="text-[12px] font-bold text-indigo-600 tabular-nums">
                  {progress}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full progress-bar-animated transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400 leading-relaxed">
                Elapsed:{' '}
                <span className="font-semibold text-slate-500 tabular-nums">
                  {formatElapsed(elapsedSec)}
                </span>
                {' · '}
                Typical time:{' '}
                <span className="font-semibold text-slate-500">30s – 2 min</span>
              </p>
              {isLongWait && (
                <p className="mt-2 text-center text-[11px] text-amber-600/90 leading-relaxed fade-in">
                  Still on server — large documents and AI models can take longer. Keep this tab open.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
