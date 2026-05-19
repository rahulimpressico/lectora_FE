import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
  Shield,
  CircleDot,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { PipelineStageState } from '../../types/pipeline'
import { BlockerAlert } from './BlockerAlert'

interface StageRowProps {
  stage: PipelineStageState
  isFirst: boolean
  isLast: boolean
}

function formatDuration(ms?: number): string | null {
  if (ms === undefined) return null
  if (ms < 1_000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1_000)}s`
}

function StatusIcon({
  status,
  isGate,
}: {
  status: PipelineStageState['status']
  isGate: boolean
}) {
  if (status === 'processing')
    return <Loader2 size={15} className="animate-spin text-brand-600" />
  if (status === 'completed')
    return <CheckCircle2 size={15} className="text-emerald-500" />
  if (status === 'failed') return <XCircle size={15} className="text-red-500" />
  if (status === 'retrying')
    return <AlertTriangle size={15} className="text-amber-500 animate-pulse" />
  // pending
  if (isGate) return <Shield size={13} className="text-slate-300" />
  return <CircleDot size={13} className="text-slate-300" />
}

export function StageRow({ stage, isFirst, isLast }: StageRowProps) {
  const isActive = stage.status === 'processing'
  const isDone = stage.status === 'completed'
  const isFailed = stage.status === 'failed'
  const isRetrying = stage.status === 'retrying'
  const isPending = stage.status === 'pending'

  return (
    <div
      className={cn(
        'px-5 py-4 transition-colors duration-300',
        !isFirst && 'border-t border-slate-100',
        isActive && 'bg-brand-50/50',
        isFailed && 'bg-red-50/40',
        isRetrying && 'bg-amber-50/40',
        isLast && isDone && 'bg-emerald-50/30',
      )}
    >
      <div className="flex items-start gap-4">
        {/* Status icon with ring */}
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full mt-0.5 transition-all duration-300',
            isActive && 'bg-brand-100 ring-2 ring-brand-300 ring-offset-1',
            isDone && 'bg-emerald-50 ring-1 ring-emerald-200',
            isFailed && 'bg-red-50 ring-1 ring-red-200',
            isRetrying && 'bg-amber-50 ring-1 ring-amber-200',
            isPending && 'bg-slate-50 ring-1 ring-slate-200',
          )}
        >
          <StatusIcon status={stage.status} isGate={stage.isGate} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'text-sm font-semibold transition-colors',
                isActive && 'text-brand-700',
                isDone && 'text-slate-700',
                isFailed && 'text-red-700',
                isRetrying && 'text-amber-700',
                isPending && 'text-slate-400',
              )}
            >
              {stage.label}
            </span>

            {stage.isGate && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                Validation Gate
              </span>
            )}

            {isRetrying && stage.retryAttempt > 0 && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                Attempt {stage.retryAttempt + 1}/3
              </span>
            )}

            {isDone && stage.outcome === 'WARNING' && (
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Passed with warnings
              </span>
            )}
          </div>

          {/* Description / status text */}
          <p
            className={cn(
              'text-xs mt-0.5 transition-colors',
              isActive && 'text-slate-600',
              isDone && 'text-slate-400',
              isFailed && 'text-red-500',
              isPending && 'text-slate-300',
              isRetrying && 'text-amber-600',
            )}
          >
            {isActive && `Running — ${stage.description.toLowerCase()}`}
            {isDone && stage.description}
            {isFailed && 'Stage failed — see error below'}
            {isPending && stage.description}
            {isRetrying && 'Validation issue detected — retrying with revised parameters…'}
          </p>

          {/* Animated progress strips while active */}
          {isActive && (
            <div className="mt-2.5 flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-0.5 flex-1 rounded-full bg-brand-100 overflow-hidden"
                >
                  <div
                    className="h-full progress-bar-animated rounded-full"
                    style={{ width: '50%', animationDelay: `${i * 0.3}s` }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Blockers */}
          {stage.blockers.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              {stage.blockers.map((b) => (
                <BlockerAlert key={b.id} blocker={b} />
              ))}
            </div>
          )}
        </div>

        {/* Right column: duration or estimate */}
        <div className="shrink-0 text-right">
          {isDone && stage.durationMs !== undefined && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={10} />
              {formatDuration(stage.durationMs)}
            </div>
          )}
          {isPending && (
            <span className="text-xs text-slate-300">
              ~{stage.estimatedDurationSec}s
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
