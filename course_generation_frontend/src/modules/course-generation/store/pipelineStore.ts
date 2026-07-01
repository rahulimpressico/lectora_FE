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
import type { JobDetail, SSEPipelineEvent } from '../types'
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
  /**
   * The highest backend log ID ingested so far.
   * Exposed so the SSE client can pass it as a `lastEventId` query param when
   * creating a new EventSource after navigation, ensuring only new log entries
   * are delivered (delta sync rather than full replay).
   */
  lastSeenLogId: number

  /**
   * Initialise or re-attach to a pipeline run.
   * Idempotent: if the store is already tracking this exact jobId the call is a
   * no-op so that navigation away and back does not reset accumulated state.
   */
  initPipeline: (jobId: string) => void
  /**
   * Hydrate stage statuses from a REST snapshot (GET /jobs/{jobId}).
   * Called immediately after the job-existence check in useJobPipeline so the
   * UI shows current stage state without waiting for the first SSE event.
   * Does NOT clear log entries — existing logs are preserved.
   */
  hydrateFromSnapshot: (detail: JobDetail) => void
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
      lastSeenLogId: 0,

      initPipeline: (jobId) => {
        set((state) => {
          // Idempotent: already tracking this job — skip reset so accumulated
          // stage state and logs are preserved across navigation.
          if (state.pipeline?.jobId === jobId) return state

          // New job (or pipeline was cleared) — full reset.
          resetBackendLogCursor()
          return {
            fatalError: null,
            lastSeenLogId: 0,
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
          }
        })
      },

      hydrateFromSnapshot: (detail: JobDetail) => {
        set((state) => {
          if (!state.pipeline || state.pipeline.jobId !== detail.jobId) return state

          const backendMap = new Map(detail.stages.map((s) => [s.stage, s]))

          const updatedStages = state.pipeline.stages.map(
            (stage): PipelineStageState => {
              const be = backendMap.get(stage.backendId)
              if (!be) return stage

              return {
                ...stage,
                status: mapStageStatus(be.status, be.outcome),
                startedAt: be.startedAt ?? undefined,
                completedAt: be.completedAt ?? undefined,
                durationMs: calcDurationMs(be.startedAt, be.completedAt),
                outcome: (be.outcome as PipelineStageState['outcome']) ?? undefined,
              }
            },
          )

          // Fold internal backend stages the same way syncFromSSEEvent does.
          // S1 folds into A2 — it ran during TO generation and is not a
          // visible stage in the Generate Course screen.
          const a0Status = backendMap.get('A0')?.status?.toUpperCase()
          const s1Status = backendMap.get('S1')?.status?.toUpperCase()
          const sectionMapperStatus = backendMap.get('SECTION_MAPPER')?.status?.toUpperCase()
          const kcPlannerStatus = backendMap.get('KC_PLANNER')?.status?.toUpperCase()

          const foldedStages = updatedStages.map((s): PipelineStageState => {
            if (s.id === 'A1' && s.status === 'pending' && a0Status === 'PROCESSING')
              return { ...s, status: 'processing' as PipelineStageStatus }
            if (
              s.id === 'A2' &&
              s.status === 'pending' &&
              (s1Status === 'PROCESSING' || sectionMapperStatus === 'PROCESSING' || kcPlannerStatus === 'PROCESSING')
            )
              return { ...s, status: 'processing' as PipelineStageStatus }
            return s
          })

          const overallStatus = mapOverallStatus(detail.status)

          // Auto-complete virtual stages if job is already done
          const finalStages = foldedStages.map((s) => {
            if (overallStatus !== 'completed') return s
            if (s.id === 'FINALIZATION' || s.id === 'EXPORT')
              return { ...s, status: 'completed' as PipelineStageStatus }
            if (s.id === 'S2' && s.status === 'pending')
              return { ...s, status: 'completed' as PipelineStageStatus }
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
              error: detail.error
                ? {
                    code: detail.error.code,
                    message: detail.error.message,
                    stage: detail.error.stage ?? undefined,
                    retryable: detail.error.retryable,
                  }
                : undefined,
            },
            // Logs are intentionally NOT cleared — preserve history across navigation
          }
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

          // ── Fold internal backend stages into adjacent visible stages ──────
          // A0, S1, SECTION_MAPPER, KC_PLANNER are not shown as standalone
          // frontend stages.  When they are PROCESSING we promote the
          // mapped visible stage so the timeline always shows progress:
          //   A0             → A1 (classification runs before A1)
          //   S1             → A2 (structure gate; folded into A2 since
          //                        TO was already reviewed in Three Panel View)
          //   SECTION_MAPPER → A2
          //   KC_PLANNER     → A2
          const a0Status = backendMap.get('A0')?.status?.toUpperCase()
          const s1Status = backendMap.get('S1')?.status?.toUpperCase()
          const sectionMapperStatus = backendMap.get('SECTION_MAPPER')?.status?.toUpperCase()
          const kcPlannerStatus = backendMap.get('KC_PLANNER')?.status?.toUpperCase()

          const internalA1Active = a0Status === 'PROCESSING'
          const internalA2Active =
            s1Status === 'PROCESSING' ||
            sectionMapperStatus === 'PROCESSING' ||
            kcPlannerStatus === 'PROCESSING'

          const foldedStages = updatedStages.map((s): PipelineStageState => {
            // A0 folds into A1: while A0 runs, show A1 as 'processing'
            if (s.id === 'A1' && s.status === 'pending' && internalA1Active) {
              return { ...s, status: 'processing' as PipelineStageStatus }
            }
            // S1 / SECTION_MAPPER / KC_PLANNER fold into A2: show A2 as 'processing'
            if (s.id === 'A2' && s.status === 'pending' && internalA2Active) {
              return { ...s, status: 'processing' as PipelineStageStatus }
            }
            return s
          })

          // ── Auto-complete virtual / late-marked stages on job completion ──
          const finalStages = foldedStages.map((s) => {
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
            lastSeenLogId: _maxSeenBackendLogId,
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
        set({ pipeline: null, logs: [], fatalError: null, lastSeenLogId: 0 })
      },
    }),
    { name: 'pipeline-store' },
  ),
)
