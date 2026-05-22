import { useRef, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import { usePipelineStore } from '../../store/pipelineStore'
import { useCourseStore } from '../../store/courseStore'
import { courseApi } from '../../api/courseApi'
import { useJobPipeline } from '../../hooks/useJobPipeline'
import { BookLoader } from './BookLoader'
import { PipelinePageBackground } from './PipelinePageBackground'
import type { PipelineStageState } from '../../types/pipeline'
import type { LogEntry } from '../../store/pipelineStore'

interface PipelineViewProps {
  jobId: string
}

// ── Log level config ────────────────────────────────────────────────
const LEVEL_CONFIG = {
  info: {
    dot: 'bg-indigo-400',
    pingHex: 'rgba(99,102,241,0.35)',
    border: 'border-l-indigo-300',
    badge: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    text: 'text-slate-600',
    label: 'Info',
  },
  warn: {
    dot: 'bg-amber-400',
    pingHex: 'rgba(245,158,11,0.35)',
    border: 'border-l-amber-300',
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
    text: 'text-amber-800',
    label: 'Warn',
  },
  error: {
    dot: 'bg-red-400',
    pingHex: 'rgba(239,68,68,0.35)',
    border: 'border-l-red-300',
    badge: 'bg-red-50 text-red-600 border-red-100',
    text: 'text-red-700',
    label: 'Error',
  },
  success: {
    dot: 'bg-emerald-400',
    pingHex: 'rgba(16,185,129,0.35)',
    border: 'border-l-emerald-300',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    text: 'text-emerald-700',
    label: 'Done',
  },
} as const

// ── Left panel: Activity Timeline ───────────────────────────────────
function ActivityLogPanel({
  logs,
  isLive,
  collapsed,
  onToggle,
}: {
  logs: LogEntry[]
  isLive: boolean
  collapsed: boolean
  onToggle: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (collapsed) return
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 90
    if (isNearBottom) el.scrollTop = el.scrollHeight
  }, [logs.length, collapsed])

  return (
    <div
      className={cn(
        'relative z-10 flex flex-col overflow-hidden border-white/45 bg-transparent backdrop-blur-[10px]',
        'lg:h-full lg:w-[320px] lg:min-w-[240px] lg:shrink-0 lg:border-r lg:border-b-0',
        'max-lg:w-full max-lg:border-b max-lg:transition-[max-height] max-lg:duration-300 max-lg:ease-out',
        collapsed ? 'max-lg:max-h-12' : 'max-lg:max-h-[min(32vh,240px)]',
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/40 bg-white/22 px-5 py-3.5 backdrop-blur-sm max-lg:px-4 max-lg:py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative flex h-2 w-2 shrink-0">
            {isLive && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60 animate-ping" />
            )}
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', isLive ? 'bg-indigo-500' : 'bg-slate-300')} />
          </div>
          <span className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Activity Feed
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-md border border-white/50 bg-white/40 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500 backdrop-blur-sm">
            {logs.length}
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand activity feed' : 'Collapse activity feed'}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/50 bg-white/40 text-slate-500 transition-colors hover:bg-white/60 lg:hidden"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Timeline entries */}
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto space-y-1.5 px-3 py-3',
          collapsed && 'hidden lg:block',
        )}
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 h-32">
            <span className="h-2 w-2 rounded-full bg-slate-200 animate-pulse" />
            <p className="text-xs text-slate-300 font-medium">Waiting for events…</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((log, idx) => {
              const cfg = LEVEL_CONFIG[log.level]
              const isLatest = idx === logs.length - 1
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  className={cn(
                    'relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl border-l-2 transition-all duration-200',
                    cfg.border,
                    isLatest
                      ? 'border border-white/55 bg-white/50 shadow-[0_2px_12px_rgba(0,0,0,0.06)] backdrop-blur-sm'
                      : 'border border-white/45 bg-white/40 backdrop-blur-sm hover:bg-white/48',
                  )}
                >
                  <div className="relative shrink-0 mt-1">
                    {isLatest && isLive && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: cfg.pingHex, width: 8, height: 8 }}
                      />
                    )}
                    <span className={cn('block rounded-full', cfg.dot)} style={{ width: 8, height: 8 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn('inline-flex text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border', cfg.badge)}>
                        {cfg.label}
                      </span>
                      <span className="text-[9px] text-slate-300 tabular-nums font-medium">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className={cn('text-[11px] leading-relaxed break-words', cfg.text, !isLatest && 'opacity-70')}>
                      {log.message}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

// ── Stage messages ──────────────────────────────────────────────────
const STAGE_MESSAGES: Record<string, string[]> = {
  A1: ['Analyzing your study guide…', 'Extracting sections and key concepts…', 'Building your enriched course outline…'],
  S1: ['Reviewing course structure…', 'Checking compliance and quality standards…', 'Validating all sections meet requirements…'],
  A2: ['Writing course content for each lesson…', 'Crafting engaging explanations and examples…', 'Generating knowledge check questions…'],
  S2: ['Reviewing generated content for accuracy…', 'Checking lesson depth and coverage…', 'Ensuring quality standards are met…'],
  FINALIZATION: ['Assembling your course…', 'Applying final structure and formatting…', 'Almost ready…'],
  EXPORT: ['Preparing your course document…', 'Formatting headings and styles…', 'Finalizing your download…'],
}

function useRotatingMessage(activeStageId: string | null): string {
  const [tick, setTick] = useState(0)
  const prevStageRef = useRef<string | null>(undefined)
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => {
        if (prevStageRef.current !== activeStageId) {
          prevStageRef.current = activeStageId
          return 0
        }
        return t + 1
      })
    }, 3500)
    return () => clearInterval(id)
  }, [activeStageId])
  const msgs = activeStageId ? (STAGE_MESSAGES[activeStageId] ?? ['Processing…']) : ['Preparing your course…']
  return msgs[tick % msgs.length]
}

const STAGE_LABEL_MAP: Record<string, string> = {
  A0: 'Classification', A1: 'Analysis', S1: 'Validation',
  A2: 'Content Writing', S2: 'Quality Review', FINALIZATION: 'Assembly', EXPORT: 'Export',
}

// ── Blocker card ────────────────────────────────────────────────────
function StageBlockerCard({ stage }: { stage: PipelineStageState }) {
  const isRetrying = stage.status === 'retrying' || (stage.status === 'processing' && stage.retryAttempt > 0)
  return (
    <div className="w-full rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
        <span className="text-xs font-semibold text-amber-800">
          {stage.label}
          {isRetrying && stage.retryAttempt > 0 && (
            <span className="ml-1.5 font-normal text-amber-600">· attempt {stage.retryAttempt}/3</span>
          )}
        </span>
        {isRetrying && <span className="ml-auto text-[10px] font-medium text-amber-500 uppercase tracking-wide">Retrying</span>}
      </div>
      <ul className="space-y-1 pl-1">
        {stage.blockers.map((b, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs text-amber-700">
            <span className="shrink-0 mt-px text-amber-400">•</span>
            <span>{b.message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Generation Console ──────────────────────────────────────────────
function GenerationConsole({
  statusMessage, activeStageId, progressPct, completedCount, totalCount,
}: {
  statusMessage: string; activeStageId: string | null
  progressPct: number; completedCount: number; totalCount: number
}) {
  const stageLabel = activeStageId ? (STAGE_LABEL_MAP[activeStageId] ?? activeStageId) : 'Initializing'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full overflow-hidden rounded-2xl border border-white/70 bg-white/78 shadow-[0_12px_40px_rgba(99,102,241,0.1),0_2px_8px_rgba(15,23,42,0.04)] backdrop-blur-2xl"
    >
      <div className="h-[2px] bg-gradient-to-r from-indigo-500/90 via-violet-500/90 to-purple-500/90" />
      <div className="relative flex divide-x divide-white/50 max-lg:flex-col max-lg:divide-x-0 max-lg:divide-y max-lg:divide-white/50">
        <div className="min-w-0 flex-1 space-y-3 px-5 pb-4 pt-4 max-lg:space-y-2.5 max-lg:px-4 max-lg:pb-3 max-lg:pt-3">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
              <Sparkles size={10} className="text-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">AI Processing</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={statusMessage}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="text-[15px] font-semibold leading-snug text-slate-800 max-lg:text-sm"
            >
              {statusMessage}
            </motion.p>
          </AnimatePresence>
          <div className="h-[2px] overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${Math.max(progressPct, 3)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100/80 bg-indigo-50/90 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 backdrop-blur-sm max-lg:max-w-[min(100%,12rem)] max-lg:truncate">
              {stageLabel}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.9s' }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex w-[128px] shrink-0 flex-col justify-between gap-3 px-4 py-4 max-lg:w-full max-lg:flex-row max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:py-3">
          <div className="max-lg:flex max-lg:items-baseline max-lg:gap-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 max-lg:mb-0">Progress</p>
            <p className="text-3xl font-bold leading-none text-indigo-600 tabular-nums max-lg:text-2xl">{progressPct}%</p>
            <p className="mt-1.5 text-[11px] leading-tight text-slate-400 max-lg:mt-0">
              <span className="lg:hidden">{completedCount}/{totalCount} stages</span>
              <span className="hidden lg:inline">{completedCount} of {totalCount}<br />stages done</span>
            </p>
          </div>
          <div className="max-lg:min-w-[7rem] max-lg:flex-1 lg:flex-none">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                initial={{ width: '4%' }}
                animate={{ width: `${Math.max(progressPct, 4)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={cn('h-full rounded-full', progressPct === 100 ? 'bg-emerald-500' : 'progress-bar-animated')}
              />
            </div>
            <p className="mt-1.5 text-right text-[10px] tabular-nums text-slate-400">{completedCount}/{totalCount}</p>
          </div>
        </div>
      </div>
      <div className="relative border-t border-white/50 bg-white/45 px-5 py-2.5 backdrop-blur-sm max-lg:px-4 max-lg:py-2">
        <p className="text-center text-[11px] leading-relaxed text-slate-400 max-lg:text-[10px]">
          Do not close this tab — AI generation is running on the server.
        </p>
      </div>
    </motion.div>
  )
}

// ── Stage timeline ──────────────────────────────────────────────────
function StageTimeline({ stages }: { stages: PipelineStageState[] }) {
  return (
    <div className="w-full max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:[-webkit-overflow-scrolling:touch]">
      <div className="flex flex-wrap items-center justify-center gap-0.5 max-lg:min-w-max max-lg:flex-nowrap max-lg:px-1 max-lg:pb-0.5">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center gap-1 max-lg:shrink-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 320, damping: 22 }}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-300 max-lg:gap-1 max-lg:px-2 max-lg:py-1 max-lg:text-[10px]',
              stage.status === 'completed' && 'border-emerald-200/80 bg-emerald-50/85 text-emerald-700 shadow-[0_1px_4px_rgba(16,185,129,0.12)] backdrop-blur-md',
              stage.status === 'processing' && 'border-indigo-200/80 bg-indigo-50/90 text-indigo-700 shadow-[0_2px_8px_rgba(99,102,241,0.12)] backdrop-blur-md',
              stage.status === 'retrying' && 'border-amber-200/80 bg-amber-50/90 text-amber-700 backdrop-blur-md',
              (stage.status === 'pending' || stage.status === 'failed') && 'border-white/60 bg-white/55 text-slate-400 backdrop-blur-md',
            )}
          >
            {stage.status === 'completed' && <CheckCircle2 size={10} className="shrink-0" />}
            {stage.status === 'processing' && <Loader2 size={10} className="animate-spin shrink-0" />}
            {stage.status === 'retrying' && <AlertTriangle size={10} className="shrink-0" />}
            {(stage.status === 'pending' || stage.status === 'failed') && (
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
            )}
            {stage.shortLabel}
          </motion.div>
          {i < stages.length - 1 && (
            <div className="w-2.5 h-px shrink-0 transition-colors duration-700"
              style={{ background: stage.status === 'completed' ? 'rgb(110,231,183)' : 'rgb(226,232,240)' }} />
          )}
        </div>
      ))}
      </div>
    </div>
  )
}

// ─── Main view ──────────────────────────────────────────────────────
export function PipelineView({ jobId }: PipelineViewProps) {
  const [feedCollapsed, setFeedCollapsed] = useState(false)
  const { pipeline, logs, fatalError } = usePipelineStore()
  const { setPhase, reset } = useCourseStore()

  useJobPipeline(jobId)

  const retryMutation = useMutation({
    mutationFn: () => courseApi.retryJob(jobId, pipeline?.error?.stage ?? 'A1'),
  })

  const statusMessage = useRotatingMessage(pipeline?.activeStageId ?? null)

  if (fatalError) {
    return (
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-8">
        <PipelinePageBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full rounded-2xl border border-red-200/80 bg-white/95 p-8 text-center shadow-[0_8px_32px_rgba(239,68,68,0.08)] backdrop-blur-sm"
        >
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
              <XCircle size={24} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-2">Session expired</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">{fatalError}</p>
          <button
            type="button"
            onClick={() => { reset() }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_3px_12px_rgba(99,102,241,0.35)] hover:shadow-[0_5px_20px_rgba(99,102,241,0.45)] hover:scale-[1.02] transition-all duration-200"
          >
            <ArrowLeft size={14} />
            Start Over
          </button>
        </motion.div>
      </div>
    )
  }

  if (!pipeline) {
    return (
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <PipelinePageBackground />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Loader2 size={22} className="animate-spin text-indigo-500" />
          <p className="text-xs text-slate-400 font-medium">Connecting to pipeline…</p>
        </div>
      </div>
    )
  }

  const { stages, activeStageId, overallStatus, error } = pipeline
  const completedCount = stages.filter((s) => s.status === 'completed').length
  const totalCount = stages.length
  const progressPct = Math.round((completedCount / totalCount) * 100)

  const isProcessing = overallStatus === 'pending' || overallStatus === 'processing'
  const isCompleted = overallStatus === 'completed'
  const isFailed = overallStatus === 'failed'

  const stagesWithBlockers = stages.filter(
    (s) => s.blockers.length > 0 && (s.status === 'processing' || s.status === 'retrying' || s.status === 'failed'),
  )

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden max-lg:flex-col max-lg:overflow-x-hidden">
      <PipelinePageBackground />

      <ActivityLogPanel
        logs={logs}
        isLive={isProcessing}
        collapsed={feedCollapsed}
        onToggle={() => setFeedCollapsed((v) => !v)}
      />

      {/* Main content — iOS-style hero + dock */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-hidden px-6 py-4 max-lg:min-w-0 max-lg:overflow-y-auto max-lg:px-3 max-lg:py-3 sm:max-lg:px-5 sm:max-lg:py-4">

        {/* Hero cluster: status → book → stage label */}
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-5 pb-4 pt-1 max-lg:max-w-3xl max-lg:gap-3 max-lg:py-2 sm:max-lg:gap-4 sm:max-lg:py-3">
          <AnimatePresence mode="wait">
            {isProcessing && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600 shadow-[0_4px_24px_rgba(99,102,241,0.1)] backdrop-blur-xl max-lg:max-w-[min(100%,20rem)] max-lg:justify-center max-lg:px-3 max-lg:text-center max-lg:text-[9px] max-lg:tracking-[0.1em]"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                </span>
                Generating your course
              </motion.div>
            )}
            {isCompleted && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/85 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 shadow-sm backdrop-blur-xl max-lg:px-3 max-lg:text-[9px] max-lg:tracking-[0.1em]"
              >
                <CheckCircle2 size={12} />
                Course ready
              </motion.div>
            )}
            {isFailed && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 rounded-full border border-red-200/80 bg-red-50/85 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-600 shadow-sm backdrop-blur-xl max-lg:px-3 max-lg:text-[9px] max-lg:tracking-[0.1em]"
              >
                <XCircle size={12} />
                Generation failed
              </motion.div>
            )}
          </AnimatePresence>

          <div className="lg:-translate-y-3">
            <BookLoader
              activeStageId={activeStageId}
              overallStatus={overallStatus}
              size="large"
            />
          </div>
        </div>

        {/* Bottom dock: progress card + timeline */}
        <div className="flex w-full max-w-lg shrink-0 flex-col items-center gap-2.5 px-2 pb-2 max-lg:max-w-[min(100%,32rem)] max-lg:gap-2 max-lg:px-1">
          {isProcessing && (
            <>
              <GenerationConsole
                statusMessage={statusMessage}
                activeStageId={activeStageId}
                progressPct={progressPct}
                completedCount={completedCount}
                totalCount={totalCount}
              />
              <StageTimeline stages={stages} />
            </>
          )}

          {isCompleted && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex w-full max-w-lg flex-col items-center gap-3 text-center max-lg:max-w-[min(100%,32rem)]">
              <p className="text-sm font-semibold text-emerald-600">Opening the Course Editor…</p>
              <StageTimeline stages={stages} />
            </motion.div>
          )}

          {isFailed && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-lg rounded-xl border border-red-200/70 bg-red-50/60 px-5 py-3.5 text-center text-sm text-red-600 max-lg:max-w-[min(100%,32rem)] max-lg:px-4 max-lg:py-3">
              {error?.message ?? 'An unexpected error occurred during generation.'}
            </motion.div>
          )}

          {stagesWithBlockers.length > 0 && (
            <div className="w-full max-w-lg space-y-2 max-lg:max-w-[min(100%,32rem)]">
              {stagesWithBlockers.map((stage) => (
                <StageBlockerCard key={stage.id} stage={stage} />
              ))}
            </div>
          )}

          {isFailed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-3 max-lg:w-full max-lg:flex-wrap max-lg:gap-2">
              <button type="button" onClick={() => setPhase('three-panel')}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm active:scale-[0.97] max-lg:min-w-0 max-lg:flex-1 max-lg:justify-center">
                <ArrowLeft size={14} />Back
              </button>
              {error?.retryable && (
                <button type="button" disabled={retryMutation.isPending}
                  onClick={() => retryMutation.mutate()}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] disabled:opacity-60 max-lg:min-w-0 max-lg:flex-1 max-lg:justify-center"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  {retryMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Retry Generation
                </button>
              )}
            </motion.div>
          )}
        </div>

      </div>
    </div>
  )
}
