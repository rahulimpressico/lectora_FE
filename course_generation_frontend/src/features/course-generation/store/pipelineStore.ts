import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  PipelineOverview,
  PipelineStageId,
  PipelineStageState,
  PipelineStageStatus,
  StageBlocker,
  BlockerSeverity,
} from '../types/pipeline'
import type { SSEPipelineEvent } from '../types'
import { buildInitialPipelineStages } from '../config/pipelineConfig'

// ─── Log entry ────────────────────────────────────────────────────────────────

export interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  stageId?: PipelineStageId
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface PipelineStoreState {
  pipeline: PipelineOverview | null
  logs: LogEntry[]
  fatalError: string | null

  initPipeline: (jobId: string) => void
  syncFromSSEEvent: (event: SSEPipelineEvent) => void
  appendLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void
  setFatalError: (message: string) => void
  clearPipeline: () => void
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapOverallStatus(raw: string): PipelineOverview['overallStatus'] {
  const upper = raw.toUpperCase()
  if (upper === 'PROCESSING') return 'processing'
  if (upper === 'COMPLETED') return 'completed'
  if (upper === 'FAILED') return 'failed'
  return 'pending'
}

function mapStageStatus(
  raw: string,
  outcome: string | null | undefined,
): PipelineStageStatus {
  const upper = raw.toUpperCase()
  if (upper === 'PROCESSING') return 'processing'
  if (upper === 'FAILED') return 'failed'
  if (upper === 'COMPLETED') {
    // RECOVERABLE_FAIL outcome means the stage is cycling — show as retrying
    return outcome?.includes('FAIL') ? 'retrying' : 'completed'
  }
  return 'pending'
}

function calcDurationMs(
  start?: string | null,
  end?: string | null,
): number | undefined {
  if (!start || !end) return undefined
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return ms > 0 ? ms : undefined
}

let _logSeq = 0
function nextLogId() {
  return `log-${++_logSeq}-${Date.now()}`
}

// Tracks the highest backend log ID ingested so far.  Since the SSE stream
// now sends deltas, this is a safety net for reconnections that re-deliver
// already-seen log entries.
let _maxSeenBackendLogId = 0

function resetBackendLogCursor() {
  _maxSeenBackendLogId = 0
}

function makeLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
  return {
    id: nextLogId(),
    timestamp: new Date().toISOString(),
    ...entry,
  }
}

function mapBlockerSeverity(raw: string): BlockerSeverity {
  if (raw === 'critical') return 'critical'
  if (raw === 'warning') return 'warning'
  return 'blocker'
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePipelineStore = create<PipelineStoreState>()(
  devtools(
    (set) => ({
      pipeline: null,
      logs: [],
      fatalError: null,

      initPipeline: (jobId) => {
        resetBackendLogCursor()
        set({
          pipeline: {
            jobId,
            overallStatus: 'pending',
            stages: buildInitialPipelineStages(),
            activeStageId: null,
          },
          logs: [
            makeLog({
              level: 'info',
              message: 'Connecting to generation pipeline…',
            }),
          ],
        })
      },

      /**
       * syncFromSSEEvent — merges a backend SSE stage_update event into the store.
       *
       * Handles:
       *   - Stage status + outcome updates from the backend
       *   - Real log entries streamed from the orchestrator (delta per event)
       *   - Per-stage validation blockers surfaced during S1/S2 retry cycles
       *   - Retry attempt count per stage
       *   - Auto-promotion of virtual stages (FINALIZATION, EXPORT, S2) on completion
       */
      syncFromSSEEvent: (event: SSEPipelineEvent) =>
        set((state) => {
          if (!state.pipeline || state.pipeline.jobId !== event.jobId)
            return state

          const overallStatus = mapOverallStatus(event.status)
          const backendMap = new Map(event.stages.map((s) => [s.stage, s]))
          const newLogs: LogEntry[] = []

          // ── Append backend log entries (deduplicate by ID) ─────────────
          // The SSE stream sends deltas, but on reconnect it may re-deliver
          // previously seen entries.  Only accept logs with an ID higher than
          // the last one we already ingested.
          for (const backendLog of event.logs) {
            if (backendLog.id <= _maxSeenBackendLogId) continue
            _maxSeenBackendLogId = backendLog.id
            newLogs.push({
              id: `be-${backendLog.id}`,
              timestamp: backendLog.createdAt,
              level: backendLog.level,
              message: backendLog.message,
              stageId: backendLog.stageId
                ? (backendLog.stageId as PipelineStageId)
                : undefined,
            })
          }

          // ── Update stage states ─────────────────────────────────────────
          const updatedStages = state.pipeline.stages.map(
            (stage): PipelineStageState => {
              const be = backendMap.get(stage.backendId)
              if (!be) return stage

              const newStatus = mapStageStatus(be.status, be.outcome)

              // Generate a concise frontend fallback log only when the backend
              // sent no log entries for this status transition.
              const hasBackendLogs = event.logs.length > 0
              if (stage.status !== newStatus && !hasBackendLogs) {
                if (newStatus === 'processing') {
                  newLogs.push(
                    makeLog({
                      level: 'info',
                      message: `${stage.label} started`,
                      stageId: stage.id,
                    }),
                  )
                } else if (newStatus === 'completed') {
                  const dur = calcDurationMs(be.startedAt, be.completedAt)
                  const suffix = dur ? ` — ${(dur / 1_000).toFixed(0)}s` : ''
                  const warning = be.outcome === 'WARNING' ? ' (with warnings)' : ''
                  newLogs.push(
                    makeLog({
                      level: 'success',
                      message: `${stage.label} complete${suffix}${warning}`,
                      stageId: stage.id,
                    }),
                  )
                } else if (newStatus === 'failed') {
                  newLogs.push(
                    makeLog({
                      level: 'error',
                      message: `${stage.label} failed`,
                      stageId: stage.id,
                    }),
                  )
                } else if (newStatus === 'retrying') {
                  newLogs.push(
                    makeLog({
                      level: 'warn',
                      message: `${stage.label} — improving and retrying…`,
                      stageId: stage.id,
                    }),
                  )
                }
              }

              // Map SSE per-stage blockers (populated during S1/S2 retry cycles)
              const blockers: StageBlocker[] = (be.blockers ?? []).map(
                (b, i): StageBlocker => ({
                  id: `blocker-${stage.id}-${i}`,
                  severity: mapBlockerSeverity(b.severity),
                  code: b.field ?? 'VALIDATION_FAILED',
                  message: b.message,
                  retryable: event.error?.retryable ?? be.retryAttempt > 0,
                }),
              )

              // Also surface the top-level job error as a blocker on the owning stage
              if (
                event.error?.stage === stage.backendId &&
                blockers.length === 0
              ) {
                blockers.push({
                  id: 'primary-error',
                  severity: 'blocker',
                  code: event.error.code,
                  message: event.error.message,
                  retryable: event.error.retryable,
                })
              }

              type ValidOutcome = PipelineStageState['outcome']

              return {
                ...stage,
                status: newStatus,
                startedAt: be.startedAt ?? undefined,
                completedAt: be.completedAt ?? undefined,
                durationMs: calcDurationMs(be.startedAt, be.completedAt),
                outcome: (be.outcome as ValidOutcome) ?? undefined,
                blockers,
                retryAttempt: be.retryAttempt ?? 0,
              }
            },
          )

          // ── Auto-complete virtual / late-marked stages on job completion ──
          const finalStages = updatedStages.map((s) => {
            if (overallStatus !== 'completed') return s
            // FINALIZATION (A6) and EXPORT (__export__) are virtual — promote them
            if (s.id === 'FINALIZATION' || s.id === 'EXPORT') {
              return { ...s, status: 'completed' as PipelineStageStatus }
            }
            // S2 may not have been explicitly completed by the orchestrator in all cases
            if (s.id === 'S2' && s.status === 'pending') {
              return { ...s, status: 'completed' as PipelineStageStatus }
            }
            return s
          })

          const activeStageId =
            finalStages.find((s) => s.status === 'processing')?.id ?? null

          return {
            pipeline: {
              ...state.pipeline,
              overallStatus,
              stages: finalStages,
              activeStageId,
              error: event.error
                ? {
                    code: event.error.code,
                    message: event.error.message,
                    stage: event.error.stage ?? undefined,
                    retryable: event.error.retryable,
                  }
                : undefined,
            },
            logs: [...state.logs, ...newLogs].slice(-400),
          }
        }),

      appendLog: (entry) =>
        set((state) => ({
          logs: [...state.logs, makeLog(entry)].slice(-400),
        })),

      setFatalError: (message) => set({ fatalError: message }),

      clearPipeline: () => {
        resetBackendLogCursor()
        set({ pipeline: null, logs: [], fatalError: null })
      },
    }),
    { name: 'pipeline-store' },
  ),
)
