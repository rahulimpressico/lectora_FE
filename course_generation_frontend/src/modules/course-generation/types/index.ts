// ─── Primitive JSON value tree ────────────────────────────────────────────────
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonArray
export interface JsonObject { [key: string]: JsonValue }
export type JsonArray = JsonValue[]

// ─── Workflow ──────────────────────────────────────────────────────────────────
export type WorkflowPhase =
  | 'welcome'              // wizard welcome screen
  | 'wizard-basics'          // wizard step 1: course basics
  | 'wizard-required-topics' // wizard step 2: required topics
  | 'wizard-audience'        // wizard step 3: audience
  | 'wizard-materials'       // wizard step 4: source materials
  | 'wizard-objectives'      // wizard step 5: learning objectives
  | 'wizard-direction'       // wizard step 6: course direction
  | 'wizard-outline-pref'    // wizard step 7: outline preference
  | 'wizard-outline-review'  // wizard step 8: outline review
  | 'upload'               // file drop + A0 TO generation
  | 'three-panel'          // review TO / rules, trigger generation
  | 'pipeline'             // A1→S1→A2→S2 processing view
  | 'course-editor'        // post-generation rich editor

export type * from './pipeline'
export type * from './editor'
export type * from './wizard'

// ─── File upload ───────────────────────────────────────────────────────────────
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'parsing'
export type UploadedFileType = 'docx' | 'pdf' | 'json'
export type IngestionStatus = 'pending' | 'processing' | 'indexed' | 'parsed' | 'failed'
export type SourceRole = 'primary_source' | 'supporting_source' | 'reference_only'
export type ImportanceLevel = 'core' | 'supporting' | 'reference_only' | 'ignore'

export interface UploadedFile {
  id: string
  file?: File
  name: string
  sizeBytes: number
  status: UploadStatus
  fileType: UploadedFileType
  errorMessage?: string
  previewHtml?: string
  blobPath?: string
  source?: 'system' | 'azure'
  extractHint?: string
  sourceRole?: SourceRole
  importance?: ImportanceLevel
  documentId?: string
  ingestionStatus?: IngestionStatus
}

// ─── Source analysis ───────────────────────────────────────────────────────────
export interface SourceAnalysis {
  sourceName: string
  sourceRole: SourceRole
  importance: ImportanceLevel
  extractHint?: string
  mainTopics: string[]
  recommendedCourseUse: string
  recommendedDepth: string
  supportsLearningObjectives: string[]
  ignoreOrReduce: string[]
}

// ─── Training Outline (TO) ────────────────────────────────────────────────────
export interface TOModule {
  id: string
  title: string
  duration: string
  objectives: string[]
  chapters: TOChapter[]
}

export interface TOChapter {
  id: string
  title: string
  duration: string
  topics: TOTopic[]
}

export interface TOTopic {
  id: string
  title: string
  duration: string
  description: string
}

export interface ParsedTO {
  courseTitle: string
  totalDuration: string
  description: string
  modules: TOModule[]
}

// ─── S1 Validation types ─────────────────────────────────────────────────────
export interface S1ValidationIssue {
  severity: 'blocker' | 'critical' | 'warning' | 'info'
  field?: string | null
  message: string
  section?: string | null
}

export interface S1Recommendation {
  priority: 'high' | 'medium' | 'low'
  action: string
  rationale?: string
}

export interface S1MissingTopic {
  topic: string
  reason: string
  suggested_placement?: string | null
}

export interface S1DependencyIssue {
  section: string
  depends_on: string
  issue: string
}

/**
 * Rich S1 validation result — returned by the backend as `s1Validation` in poll
 * responses (completed jobs) and in failed poll responses (S1 blocked after retries).
 */
export interface S1ValidationResult {
  summary: string
  overall_score: number
  coverage_score: number
  sequence_score: number
  relevance_score: number
  completeness_score: number
  confidence: number
  status: 'PASS' | 'FAIL'
  issues: S1ValidationIssue[]
  recommendations: S1Recommendation[]
  missing_topics: S1MissingTopic[]
  duplicates: string[]
  dependency_issues?: S1DependencyIssue[]
  retry_required: boolean
  retry_prompt: string
  /** Number of blocker-severity issues. */
  blockers?: number
  /** Number of critical-severity issues. */
  criticals?: number
  /** Number of warning-severity issues. */
  warnings?: number
}

// ─── Generate TO API response ─────────────────────────────────────────────────
export interface GenerateTOResponse {
  to: JsonObject
  rules: JsonObject
  /** Blob path of the saved generated-TO JSON file. Pass as timedOutline.blobPath
   *  in POST /jobs so the pipeline reuses this TO instead of re-generating it. */
  toBlobPath?: string
  /** S1 validation result for the generated TO — present on successful completion. */
  s1Validation?: S1ValidationResult | JsonObject
}

/** HTTP 202 from POST /documents/generate-to (async mode). */
export interface GenerateTOJobAccepted {
  jobId: string
  status: string
  message: string
  pollUrl: string
}

/** A single log entry from the generate-to polling response. */
export interface GenerateTOStageLog {
  id: number
  level: string
  message: string
  stage?: string | null
  ts?: number
}

/** GET /documents/generate-to/jobs/{jobId} */
export interface GenerateTOJobPollResponse {
  jobId: string
  status: 'processing' | 'completed' | 'failed' | 'cancelled'
  message?: string
  error?: string
  to?: JsonObject
  rules?: JsonObject
  toBlobPath?: string
  /**
   * S1 validation result.
   * - On `completed`: full a1-phase validation (PASS result with scores).
   * - On `failed` (S1 blocked): partial to-only validation with the block details.
   */
  s1Validation?: S1ValidationResult | JsonObject
  /** Backend stage logs — used by TOGenerationLoader to track A0 / S1 / A1 progress. */
  logs?: GenerateTOStageLog[]
}

// ─── Rule pack ────────────────────────────────────────────────────────────────
export type RulePackValue = string | number | boolean | string[]
export interface RulePack { [key: string]: RulePackValue }

// ─── Job ──────────────────────────────────────────────────────────────────────
export type JobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'

export interface JobResponse {
  jobId: string
  status: JobStatus
  createdAt: string
  updatedAt: string
  artifactUrl?: string
  errorMessage?: string
  progress?: number
}

// Full job detail including per-stage progress — matches backend JobDetailResponse
export interface JobStageProgress {
  stage: string          // PipelineStep: A0 | A1 | S1 | A2 | S2 | …
  status: string         // StageStatus: PENDING | PROCESSING | COMPLETED | FAILED
  startedAt: string | null
  completedAt: string | null
  outcome: string | null // ValidationOutcome: PASS | WARNING | RECOVERABLE_FAIL | CRITICAL_FAIL
}

export interface JobErrorDetail {
  code: string
  message: string
  stage: string | null
  retryable: boolean
}

export interface JobDetail {
  jobId: string
  status: JobStatus
  createdAt: string
  updatedAt: string
  stages: JobStageProgress[]
  error: JobErrorDetail | null
}

export interface SourceFileSpec {
  blobPath: string
  extractHint?: string
  importance?: ImportanceLevel
}

export interface GenerateCoursePayload {
  courseTitle: string
  courseType: string
  inputs: {
    studyGuide: { blobPath: string }
    timedOutline?: { blobPath: string }
  }
  /** User-edited Training Outline JSON from the three-panel TO editor.
   *  The backend injects this into shared_state so A1 uses the reviewed version. */
  toOverride?: JsonObject
  /** Per-file source specs including blob path, extract hint, and importance.
   *  Passed to A2 so it can build a chunk index and apply per-file guidance. */
  sourceFileSpecs?: SourceFileSpec[]
  /** Target audience — mandatory, drives content calibration throughout the pipeline. */
  audience: string
  /** Onboarding wizard fields forwarded to A2 for dynamic prompt construction. */
  courseConfig?: {
    /** User-provided title — single source of truth, never overwritten by LLM. */
    courseTitle?: string
    /** User-provided description — used verbatim in DOCX overview, never regenerated. */
    courseDescription?: string
    experienceLevel?: string
    learnerOutcomes?: string
    audienceNotes?: string
    learningObjectives?: string[]
    tone?: string
    depth?: string
    emphasis?: string
    avoid?: string
    includeScenarios?: boolean
    includeExamples?: boolean
    includeKnowledgeChecks?: boolean
  }
}

// ─── SSE Pipeline Events (GET /jobs/{jobId}/events) ───────────────────────────

/** A single structured log entry streamed from the orchestrator. */
export interface SSELogEntry {
  id: number
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  stageId: string | null
  createdAt: string
}

/** A validation issue surfaced inline per-stage during S1/S2 retry cycles. */
export interface SSEStageBlocker {
  severity: string
  field?: string | null
  message: string
}

/** Per-stage snapshot included in every SSE event. */
export interface SSEStage {
  stage: string
  status: string
  startedAt: string | null
  completedAt: string | null
  outcome: string | null
  /** Validation blockers for this stage (populated during S1/S2 retry cycles). */
  blockers: SSEStageBlocker[]
  /** Which gate cycle is currently active (1-based). */
  retryAttempt: number
}

/** Full SSE `stage_update` event payload. */
export interface SSEPipelineEvent {
  type: 'stage_update'
  jobId: string
  status: string
  updatedAt: string | null
  stages: SSEStage[]
  error: JobErrorDetail | null
  /** New log entries since the previous event (delta, not full history). */
  logs: SSELogEntry[]
}
