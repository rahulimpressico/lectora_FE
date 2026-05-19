import type { PipelineStageId, PipelineStageState } from '../types/pipeline'

export interface PipelineStageConfig {
  id: PipelineStageId
  backendId: string
  label: string
  description: string
  isGate: boolean
  estimatedDurationSec: number
}

// Source of truth for visible pipeline stages and their metadata.
// Stages A0 / A3 / A4 / A5 are internal and not surfaced in the UI.
export const PIPELINE_STAGE_CONFIGS: PipelineStageConfig[] = [
  {
    id: 'A1',
    backendId: 'A1',
    label: 'Outline Interpretation',
    description: 'Parsing document structure and building enriched course outline',
    isGate: false,
    estimatedDurationSec: 60,
  },
  {
    id: 'S1',
    backendId: 'S1',
    label: 'Content Validation',
    description: 'Running structural quality gate — outline compliance & reference checks',
    isGate: true,
    estimatedDurationSec: 25,
  },
  {
    id: 'A2',
    backendId: 'A2',
    label: 'Content Generation',
    description: 'Generating full course content with AI — one lesson at a time',
    isGate: false,
    estimatedDurationSec: 200,
  },
  {
    id: 'S2',
    backendId: 'S2',
    label: 'Quality Assurance',
    description: 'Validating generated content for accuracy, tone, and completeness',
    isGate: true,
    estimatedDurationSec: 30,
  },
  {
    id: 'FINALIZATION',
    backendId: 'A6',
    label: 'Course Finalization',
    description: 'Assembling final course structure and applying compliance rules',
    isGate: false,
    estimatedDurationSec: 15,
  },
  {
    id: 'EXPORT',
    backendId: '__export__',
    label: 'DOCX Export',
    description: 'Rendering formatted Word document with styles and headings',
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

export function buildInitialPipelineStages(): PipelineStageState[] {
  return PIPELINE_STAGE_CONFIGS.map((cfg) => ({
    id: cfg.id,
    backendId: cfg.backendId,
    status: 'pending',
    label: cfg.label,
    description: cfg.description,
    isGate: cfg.isGate,
    blockers: [],
    retryAttempt: 0,
    estimatedDurationSec: cfg.estimatedDurationSec,
  }))
}
