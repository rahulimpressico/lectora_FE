import type { PipelineStageId, PipelineStageState } from '../types/pipeline'

export interface PipelineStageConfig {
  id: PipelineStageId
  backendId: string
  /** Full label shown in stage rows, blocker cards, and log messages. */
  label: string
  /** Short label shown in the compact stage pill row (≤8 chars). */
  shortLabel: string
  description: string
  isGate: boolean
  estimatedDurationSec: number
}

/**
 * Visible pipeline stages for the Generate Course screen.
 *
 * TO generation (A0 → S1 TO-only phase) already ran before the Three Panel
 * View, so those stages are NOT shown here.  The Generate Course pipeline
 * shows only the content-generation stages: A1 → A2 → S2.
 *
 * Internal backend stages that run but are NOT shown as separate steps:
 *   A0             → folded into A1  (classification re-run)
 *   S1             → folded into A2  (structure gate between A1 and A2)
 *   SECTION_MAPPER → folded into A2  (runs between S1 and A2)
 *   KC_PLANNER     → folded into A2  (runs between S1 and A2)
 */
export const PIPELINE_STAGE_CONFIGS: PipelineStageConfig[] = [
  {
    id: 'A1',
    backendId: 'A1',
    label: 'Preparing Final Outline',
    shortLabel: 'Outline',
    description: 'Interpreting the reviewed Course Structure',
    isGate: false,
    estimatedDurationSec: 90,
  },
  {
    id: 'A2',
    backendId: 'A2',
    label: 'Generating Course Content',
    shortLabel: 'Content',
    description: 'AI is writing comprehensive content for every lesson and knowledge check',
    isGate: false,
    estimatedDurationSec: 240,
  },
  {
    id: 'S2',
    backendId: 'S2',
    label: 'Validating Generated Content',
    shortLabel: 'Validate',
    description: 'Reviewing generated content for accuracy, tone, compliance, and completeness',
    isGate: true,
    estimatedDurationSec: 30,
  },
  {
    id: 'FINALIZATION',
    backendId: 'A6',
    label: 'Course Assembly',
    shortLabel: 'Assemble',
    description: 'Assembling all sections and applying final course structure',
    isGate: false,
    estimatedDurationSec: 15,
  },
  {
    id: 'EXPORT',
    backendId: '__export__',
    label: 'Final Export',
    shortLabel: 'Export',
    description: 'Rendering your formatted course document',
    isGate: false,
    estimatedDurationSec: 10,
  },
]

export const BACKEND_STAGE_TO_PIPELINE_ID: Record<string, PipelineStageId> = {
  A1: 'A1',
  A2: 'A2',
  S2: 'S2',
  A6: 'FINALIZATION',
}

/**
 * Internal / hidden backend stages folded into adjacent visible stages.
 * While any of these stages is PROCESSING the mapped visible stage is
 * promoted to 'processing' so the timeline always shows meaningful progress.
 *
 *   A0             → A1  (classification re-run before A1)
 *   S1             → A2  (structure gate; already ran during TO generation,
 *                          but may run again in the main pipeline — fold into
 *                          A2 so the user sees a clean A1 → A2 → S2 flow)
 *   SECTION_MAPPER → A2  (runs between S1 and A2)
 *   KC_PLANNER     → A2  (runs between S1 and A2)
 */
export const INTERNAL_STAGE_FOLD_MAP: Record<string, PipelineStageId> = {
  A0: 'A1',
  S1: 'A2',
  SECTION_MAPPER: 'A2',
  KC_PLANNER: 'A2',
}

export function buildInitialPipelineStages(): PipelineStageState[] {
  return PIPELINE_STAGE_CONFIGS.map((cfg) => ({
    id: cfg.id,
    backendId: cfg.backendId,
    status: 'pending',
    label: cfg.label,
    shortLabel: cfg.shortLabel,
    description: cfg.description,
    isGate: cfg.isGate,
    blockers: [],
    retryAttempt: 0,
    estimatedDurationSec: cfg.estimatedDurationSec,
  }))
}
