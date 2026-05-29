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

// Source of truth for visible pipeline stages and their metadata.
// A0 / SECTION_MAPPER / KC_PLANNER are internal and folded into adjacent stages.
export const PIPELINE_STAGE_CONFIGS: PipelineStageConfig[] = [
  {
    id: 'A1',
    backendId: 'A1',
    label: 'Knowledge Extraction',
    shortLabel: 'Extract',
    description: 'Analyzing your document and building an enriched course outline',
    isGate: false,
    estimatedDurationSec: 90,
  },
  {
    id: 'S1',
    backendId: 'S1',
    label: 'Structure Review',
    shortLabel: 'Review',
    description: 'Validating course structure against quality and compliance standards',
    isGate: true,
    estimatedDurationSec: 25,
  },
  {
    id: 'A2',
    backendId: 'A2',
    label: 'Content Generation',
    shortLabel: 'Generate',
    description: 'AI is writing comprehensive content for every lesson',
    isGate: false,
    estimatedDurationSec: 240,
  },
  {
    id: 'S2',
    backendId: 'S2',
    label: 'Quality Assurance',
    shortLabel: 'QA',
    description: 'Reviewing generated content for accuracy, tone, and completeness',
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
  S1: 'S1',
  A2: 'A2',
  S2: 'S2',
  A6: 'FINALIZATION',
}

/**
 * Internal backend stages that are NOT shown as standalone frontend stages.
 * Instead, while they are PROCESSING, their corresponding visible stage is
 * promoted to 'processing' so the UI always shows meaningful progress:
 *
 *   A0             → folds into A1  (document analysis runs before A1)
 *   SECTION_MAPPER → folds into A2  (runs between S1 and A2)
 *   KC_PLANNER     → folds into A2  (runs between S1 and A2)
 */
export const INTERNAL_STAGE_FOLD_MAP: Record<string, PipelineStageId> = {
  A0: 'A1',
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
