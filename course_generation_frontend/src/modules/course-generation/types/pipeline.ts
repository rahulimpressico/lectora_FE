// ─── Pipeline Stage IDs ────────────────────────────────────────────────────────
// A1/A2/S2 map directly to backend PipelineStep values.
// S1 ran during TO generation (before Three Panel View) and is not shown here.
// FINALIZATION / EXPORT are virtual front-end-only stages.
export type PipelineStageId =
  | 'A1'
  | 'A2'
  | 'S2'
  | 'FINALIZATION'
  | 'EXPORT'

export type PipelineStageStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying'

export type BlockerSeverity = 'blocker' | 'critical' | 'warning'

export interface StageBlocker {
  id: string
  severity: BlockerSeverity
  code: string
  message: string
  retryable: boolean
}

export interface PipelineStageState {
  id: PipelineStageId
  backendId: string
  status: PipelineStageStatus
  label: string
  /** Compact label for the stage pill row (≤8 chars). */
  shortLabel: string
  description: string
  isGate: boolean
  startedAt?: string
  completedAt?: string
  durationMs?: number
  outcome?: 'PASS' | 'WARNING' | 'RECOVERABLE_FAIL' | 'CRITICAL_FAIL'
  blockers: StageBlocker[]
  retryAttempt: number
  estimatedDurationSec: number
}

export interface PipelineOverview {
  jobId: string
  overallStatus: 'pending' | 'processing' | 'completed' | 'failed'
  stages: PipelineStageState[]
  activeStageId: PipelineStageId | null
  error?: {
    code: string
    message: string
    stage?: string
    retryable: boolean
  }
}
