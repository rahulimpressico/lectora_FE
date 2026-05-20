import { useMutation } from '@tanstack/react-query'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { usePipelineStore } from '../../store/pipelineStore'
import { useCourseStore } from '../../store/courseStore'
import { courseApi } from '../../api/courseApi'
import { useJobPipeline } from '../../hooks/useJobPipeline'
import { BookLoader } from './BookLoader'
import { LiveLogPanel } from './LiveLogPanel'
import type { PipelineStageState } from '../../types/pipeline'

interface PipelineViewProps {
  jobId: string
}

// ── Stage dot ──────────────────────────────────────────────────────────────────

function StageDot({ stage }: { stage: PipelineStageState }) {
  const base = 'relative flex items-center justify-center rounded-full transition-all duration-500'

  if (stage.status === 'completed') {
    return (
      <div
        className={cn(base, 'w-7 h-7 bg-emerald-500')}
        style={{ boxShadow: '0 0 10px rgba(16,185,129,0.35)' }}
        title={stage.label}
      >
        <CheckCircle2 size={14} className="text-white" />
      </div>
    )
  }
  if (stage.status === 'failed') {
    return (
      <div className={cn(base, 'w-7 h-7 bg-red-500')} title={stage.label}>
        <XCircle size={14} className="text-white" />
      </div>
    )
  }
  if (stage.status === 'processing') {
    return (
      <div
        className={cn(base, 'w-7 h-7 stage-dot-active')}
        style={{ background: 'rgba(99,102,241,0.9)', boxShadow: '0 0 14px rgba(99,102,241,0.5)' }}
        title={stage.label}
      >
        <Loader2 size={12} className="text-white animate-spin" />
      </div>
    )
  }
  if (stage.status === 'retrying') {
    return (
      <div
        className={cn(base, 'w-7 h-7 bg-amber-400')}
        style={{ boxShadow: '0 0 10px rgba(245,158,11,0.4)' }}
        title={stage.label}
      >
        <AlertTriangle size={12} className="text-white" />
      </div>
    )
  }
  return (
    <div
      className={cn(base, 'w-7 h-7')}
      style={{ background: 'rgb(241,245,249)', border: '1.5px solid rgb(203,213,225)' }}
      title={stage.label}
    />
  )
}

// ── Stage pill row ─────────────────────────────────────────────────────────────

function StagePillRow({ stages }: { stages: PipelineStageState[] }) {
  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1.5">
            <StageDot stage={stage} />
            <span
              className="text-[10px] font-semibold tracking-wide"
              style={{
                color:
                  stage.status === 'completed'
                    ? 'rgb(5,150,105)'
                    : stage.status === 'processing'
                      ? 'rgb(79,70,229)'
                      : stage.status === 'failed'
                        ? 'rgb(220,38,38)'
                        : stage.status === 'retrying'
                          ? 'rgb(217,119,6)'
                          : 'rgb(148,163,184)',
              }}
            >
              {stage.shortLabel}
            </span>
          </div>
          {i < stages.length - 1 && (
            <div
              className="w-6 h-px mb-5 transition-all duration-700"
              style={{
                background:
                  stage.status === 'completed'
                    ? 'rgb(110,231,183)'
                    : 'rgb(226,232,240)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Inline blocker card ────────────────────────────────────────────────────────

function StageBlockerCard({ stage }: { stage: PipelineStageState }) {
  const isRetrying =
    stage.status === 'retrying' ||
    (stage.status === 'processing' && stage.retryAttempt > 0)
  const MAX_GATE_CYCLES = 3

  return (
    <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3.5 fade-in">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
        <span className="text-xs font-semibold text-amber-800">
          {stage.label}
          {isRetrying && stage.retryAttempt > 0 && (
            <span className="ml-1.5 font-normal text-amber-600">
              · attempt {stage.retryAttempt}/{MAX_GATE_CYCLES}
            </span>
          )}
        </span>
        {isRetrying && (
          <span className="ml-auto text-[10px] font-medium text-amber-500 uppercase tracking-wide">
            Retrying
          </span>
        )}
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

// ── Dynamic status messages per visible stage ──────────────────────────────────

const STAGE_MESSAGES: Record<string, string[]> = {
  A1: [
    'Analyzing your study guide…',
    'Extracting sections, objectives, and key concepts…',
    'Building your enriched course outline…',
  ],
  S1: [
    'Reviewing course structure…',
    'Checking compliance and quality standards…',
    'Validating all sections meet requirements…',
  ],
  A2: [
    'Writing course content for each lesson…',
    'Crafting engaging explanations and examples…',
    'Generating knowledge check questions…',
  ],
  S2: [
    'Reviewing generated content for accuracy…',
    'Checking lesson depth and coverage…',
    'Ensuring quality standards are met…',
  ],
  FINALIZATION: [
    'Assembling your course…',
    'Applying final structure and formatting…',
    'Almost ready…',
  ],
  EXPORT: [
    'Preparing your course document…',
    'Formatting headings and styles…',
    'Finalizing your download…',
  ],
}

function useRotatingMessage(activeStageId: string | null): string {
  const msgs = activeStageId
    ? (STAGE_MESSAGES[activeStageId] ?? ['Processing…'])
    : ['Preparing your course…']
  const idx = Math.floor(Date.now() / 3_500) % msgs.length
  return msgs[idx]
}

// ── Stage progress checklist (shown during generation) ─────────────────────────

function StageChecklist({ stages }: { stages: PipelineStageState[] }) {
  const visible = stages.filter((s) =>
    s.status === 'completed' || s.status === 'processing' || s.status === 'retrying',
  )
  if (visible.length === 0) return null

  return (
    <div className="w-full max-w-xs space-y-1.5 fade-in">
      {visible.map((stage) => (
        <div key={stage.id} className="flex items-center gap-2.5">
          {stage.status === 'completed' && (
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
          )}
          {stage.status === 'processing' && (
            <Loader2 size={13} className="text-indigo-500 animate-spin shrink-0" />
          )}
          {stage.status === 'retrying' && (
            <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              stage.status === 'completed' && 'text-emerald-700',
              stage.status === 'processing' && 'text-indigo-700',
              stage.status === 'retrying' && 'text-amber-700',
            )}
          >
            {stage.label}
            {stage.isGate && stage.status === 'completed' && (
              <ShieldCheck size={11} className="inline ml-1 opacity-60" />
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main view ─────────────────────────────────────────────────────────────────

export function PipelineView({ jobId }: PipelineViewProps) {
  const { pipeline, logs, fatalError } = usePipelineStore()
  const { setPhase, reset } = useCourseStore()

  useJobPipeline(jobId)

  const retryMutation = useMutation({
    mutationFn: () =>
      courseApi.retryJob(jobId, pipeline?.error?.stage ?? 'A1'),
  })

  const statusMessage = useRotatingMessage(pipeline?.activeStageId ?? null)

  // ── Fatal error ────────────────────────────────────────────────────────────

  if (fatalError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <XCircle size={24} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-base font-semibold text-slate-800 mb-2">Session expired</h2>
          <p className="text-sm text-slate-500 mb-6">{fatalError}</p>
          <button
            type="button"
            onClick={() => { reset() }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft size={14} />
            Start Over
          </button>
        </div>
      </div>
    )
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (!pipeline) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
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
    (s) =>
      s.blockers.length > 0 &&
      (s.status === 'processing' || s.status === 'retrying' || s.status === 'failed'),
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <div className="relative flex-1 flex flex-col items-center justify-between overflow-y-auto py-10 px-4">

        {/* ── Status badge ──────────────────────────────────────────────── */}
        <div className="text-center slide-up">
          {isProcessing && (
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-600">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"
                style={{ animation: 'pulse-ring 1.6s ease-out infinite' }}
              />
              Generating your course
            </div>
          )}
          {isCompleted && (
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 size={13} />
              Course ready
            </div>
          )}
          {isFailed && (
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest bg-red-50 border border-red-200 text-red-600">
              <XCircle size={13} />
              Generation failed
            </div>
          )}
        </div>

        {/* ── Book hero + status text ────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-5 my-4">
          <BookLoader activeStageId={activeStageId} overallStatus={overallStatus} />

          {isProcessing && (
            <p
              className="shimmer-text text-sm font-medium text-center max-w-xs"
              key={statusMessage}
            >
              {statusMessage}
            </p>
          )}
          {isCompleted && (
            <p className="text-sm font-medium text-emerald-600 text-center">
              Opening the Course Editor…
            </p>
          )}
          {isFailed && (
            <p className="text-sm text-red-600 text-center max-w-sm">
              {error?.message ?? 'An unexpected error occurred during generation.'}
            </p>
          )}

          {/* Stage checklist — inline progress milestones */}
          {isProcessing && <StageChecklist stages={stages} />}
        </div>

        {/* ── Stage dots + progress bar ──────────────────────────────────── */}
        <div className="flex flex-col items-center gap-5 w-full max-w-lg">
          <StagePillRow stages={stages} />

          {isProcessing && (
            <div className="w-64 fade-in">
              <div className="flex justify-between text-xs mb-1.5 text-slate-400">
                <span>{completedCount} of {totalCount} stages complete</span>
                <span className="tabular-nums font-semibold text-indigo-500">{progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-slate-200">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    progressPct === 100 ? 'bg-emerald-500' : 'progress-bar-animated',
                  )}
                  style={{ width: `${Math.max(progressPct, 4)}%` }}
                />
              </div>
            </div>
          )}

          {/* Validation issue cards */}
          {stagesWithBlockers.length > 0 && (
            <div className="w-full space-y-2 mt-1">
              {stagesWithBlockers.map((stage) => (
                <StageBlockerCard key={stage.id} stage={stage} />
              ))}
            </div>
          )}

          {/* Failed — action buttons */}
          {isFailed && (
            <div className="flex items-center gap-3 fade-in">
              <button
                type="button"
                onClick={() => setPhase('three-panel')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              {error?.retryable && (
                <button
                  type="button"
                  disabled={retryMutation.isPending}
                  onClick={() => retryMutation.mutate()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-60 transition-colors"
                  style={{ background: '#4f46e5' }}
                >
                  {retryMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  Retry Generation
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Activity log ──────────────────────────────────────────────── */}
        {logs.length > 0 && (
          <div className="w-full max-w-2xl mt-4 fade-in">
            <LiveLogPanel logs={logs} />
          </div>
        )}
      </div>
    </div>
  )
}
