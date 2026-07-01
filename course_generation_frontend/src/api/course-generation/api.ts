/**
 * api/course-generation/api.ts
 *
 * Document upload and Training Outline (TO) generation.
 * Covers the upload phase and TO async-poll flow.
 */
import apiClient from '@/api/client'
import { ApiClientError } from '@/api/errors'
import type {
  GenerateTOJobAccepted,
  GenerateTOJobPollResponse,
  GenerateTOResponse,
  ImportanceLevel,
  SourceAnalysis,
  SourceRole,
} from '@/modules/course-generation/types'

// ─── Internal helpers ─────────────────────────────────────────────────────────

const GENERATE_TO_START_TIMEOUT_MS = 10 * 60 * 1_000
// When the server is busy (503), retry the initial POST with backoff before giving up.
const BUSY_RETRY_DELAYS_MS = [3_000, 6_000, 12_000, 20_000]

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(() => resolve(), ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Upload a single document (DOCX / PDF) to blob storage.
 * Returns the blob path, upload folder, and document ID for downstream use.
 *
 * Note: do NOT set Content-Type manually — Axios auto-sets multipart/form-data
 * with the correct boundary when a FormData body is detected.
 */
export async function uploadDocument(
  file: File,
  courseTopic: string,
): Promise<{ blobPath: string; uploadFolder: string; documentId: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('courseTopic', courseTopic.trim())
  const { data } = await apiClient.post<{ blobPath: string; uploadFolder: string; documentId: string }>(
    '/documents/upload',
    form,
    {
      // Large PDFs can take several minutes on slower networks / disks.
      timeout: 10 * 60 * 1_000,
    },
  )
  return data
}

export interface IngestionStatusResponse {
  document_id: string
  status: 'pending' | 'processing' | 'indexed' | 'parsed' | 'failed'
  total_chunks: number
  error: string | null
  updated_at: number
}

/**
 * Poll the backend ingestion status for a document uploaded via POST /documents/upload.
 * Returns null with a 404 — document_id unknown or expired.
 */
export async function pollIngestionStatus(documentId: string): Promise<IngestionStatusResponse | null> {
  try {
    const { data } = await apiClient.get<IngestionStatusResponse>(
      `/documents/${documentId}/ingestion-status`,
      { timeout: 15_000 },
    )
    return data
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return null
    throw err
  }
}

/** Cancel an in-flight A0 generate-to job on the backend (best-effort, fire-and-forget). */
export async function cancelGenerateTO(jobId: string): Promise<void> {
  await apiClient.post(`/documents/generate-to/jobs/${jobId}/cancel`, null, { timeout: 10_000 })
}

/**
 * Fire the POST to start a TO-generation job.
 *
 * Returns either a synchronous result (200) or an accepted response (202) with
 * a `jobId` to poll.  Applies 503 back-off retries before giving up.
 *
 * Does NOT poll — use `pollGenerateTOJob` + TanStack Query for that.
 */
export async function startGenerateTO(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<GenerateTOResponse | GenerateTOJobAccepted> {
  for (let attempt = 0; ; attempt++) {
    try {
      const { data } = await apiClient.post<GenerateTOResponse | GenerateTOJobAccepted>(
        '/documents/generate-to',
        body,
        { signal, timeout: GENERATE_TO_START_TIMEOUT_MS },
      )
      return data
    } catch (err) {
      const isBusy = err instanceof ApiClientError && err.status === 503
      const delay = BUSY_RETRY_DELAYS_MS[attempt]
      if (isBusy && delay !== undefined) {
        await sleep(delay, signal)
        continue
      }
      throw err
    }
  }
}

/**
 * Fetch the current status of a single async TO-generation job.
 * Throws ApiClientError(404) if the server restarted and lost the job.
 */
export async function pollGenerateTOJob(jobId: string): Promise<GenerateTOJobPollResponse> {
  const { data } = await apiClient.get<GenerateTOJobPollResponse>(
    `/documents/generate-to/jobs/${jobId}`,
    { timeout: 30_000 },
  )
  return data
}

export interface TOTaskSummary {
  jobId: string
  status: 'processing' | 'completed' | 'failed' | 'cancelled'
  message: string
  createdAt: number   // Unix timestamp
  finishedAt: number | null
  error: string | null
  blobPaths: string[]
}

/** List all recent TO-generation jobs from the server (newest first). */
export async function listGenerateTOJobs(): Promise<TOTaskSummary[]> {
  const { data } = await apiClient.get<TOTaskSummary[]>('/documents/generate-to/jobs', { timeout: 10_000 })
  return data
}

/** Load a previously saved TO JSON (generated_to.json or llm_to_outline.json). */
export async function loadTrainingOutlineFromPath(
  path: string,
  source: 'uploads' | 'artifacts' = 'uploads',
): Promise<GenerateTOResponse> {
  const { data } = await apiClient.get<GenerateTOResponse>('/documents/load-to', {
    params: { path, source },
    timeout: 30_000,
  })
  return data
}

// ─── Learning Objectives ──────────────────────────────────────────────────────

export interface GenerateLearningObjectivesBody {
  sourceMaterials?: string[]
  courseTitle?: string
  courseDescription?: string
  courseType?: string
  courseDuration?: string
  targetAudience?: string
  skillLevel?: string
  desiredOutcomes?: string
  certificationFocus?: string
  additionalInstructions?: string
  sourceAnalyses?: SourceAnalysis[]
  requiredTopics?: string[]
  regenerationPrompt?: string
  currentObjectives?: string[]
}

export interface LOValidationIssue {
  type: string
  message: string
  affected_objectives: string[]
  expected_action: string
}

export interface GenerateLearningObjectivesResponse {
  learningObjectives: string[]
  validationPassed: boolean
  repairAttempts: number
  finalIssues: LOValidationIssue[]
}

/** AI-generate measurable learning objectives from course metadata. */
export async function generateLearningObjectives(
  body: GenerateLearningObjectivesBody,
): Promise<GenerateLearningObjectivesResponse> {
  const { data } = await apiClient.post<GenerateLearningObjectivesResponse>(
    '/documents/generate-learning-objectives',
    body,
    { timeout: 60_000 },
  )
  return data
}

// ─── Course type suggestion ───────────────────────────────────────────────────

export interface SuggestCourseTypeBody {
  courseTitle?: string
  courseDescription?: string
  targetAudience?: string
  learningObjectives?: string[]
}

export interface SuggestCourseTypeResult {
  ruleFamily: string        // e.g. "insurance_ce"
  ruleFamilyLabel: string   // e.g. "Insurance CE"
  confidence: number
  reasoning: string
}

/**
 * AI-suggest the best rule family / course type from wizard metadata.
 * Only call when the user explicitly clicks "Suggested by AI" — never auto-trigger.
 */
export async function suggestCourseType(
  body: SuggestCourseTypeBody,
): Promise<SuggestCourseTypeResult> {
  const { data } = await apiClient.post<SuggestCourseTypeResult>(
    '/documents/suggest-course-type',
    body,
    { timeout: 30_000 },
  )
  return data
}

// ─── Required topics suggestion ───────────────────────────────────────────────

export interface SuggestRequiredTopicsBody {
  courseTitle?: string
  courseDescription?: string
  courseType?: string
  courseDuration?: string
  targetAudience?: string
  skillLevel?: string
  learnerOutcomes?: string
  regenerationPrompt?: string
  currentTopics?: string[]
}

export interface RTValidationIssue {
  type: string
  message: string
  affectedTopics: string[]
  expectedAction: string
}

export interface SuggestRequiredTopicsResult {
  requiredTopics: string[]
  validationPassed: boolean
  repairAttempts: number
  finalIssues: RTValidationIssue[]
}

/** AI-suggest required topics from course metadata. */
export async function suggestRequiredTopics(
  body: SuggestRequiredTopicsBody,
): Promise<SuggestRequiredTopicsResult> {
  const { data } = await apiClient.post<SuggestRequiredTopicsResult>(
    '/documents/suggest-required-topics',
    body,
    { timeout: 90_000 },
  )
  return data
}

// ─── Outline structure suggestion ─────────────────────────────────────────────

export interface SuggestOutlineStructureBody {
  courseTitle?: string
  courseDescription?: string
  courseType?: string
  targetAudience?: string
  skillLevel?: string
  learningObjectives?: string[]
}

interface SuggestOutlineStructureResult {
  preferredChapters: number
  lessonStyle: string
  reasoning: string
}

/** AI-suggest chapter count and lesson style for the course outline. */
export async function suggestOutlineStructure(
  body: SuggestOutlineStructureBody,
): Promise<SuggestOutlineStructureResult> {
  const { data } = await apiClient.post<SuggestOutlineStructureResult>(
    '/documents/suggest-outline-structure',
    body,
    { timeout: 30_000 },
  )
  return data
}

// ─── TO persistence (user edits → backend blob) ──────────────────────────────

export interface SaveTOResponse {
  blobPath: string
}

/**
 * Persist the user-edited Training Outline to the backend blob at `blobPath`.
 * The backend overwrites the file in FE format so that `GET /documents/load-to`
 * returns user edits on the next page refresh, regardless of localStorage state.
 */
export async function saveTrainingOutline(
  blobPath: string,
  to: Record<string, unknown>,
  rules: Record<string, unknown> | null,
): Promise<SaveTOResponse> {
  const { data } = await apiClient.post<SaveTOResponse>(
    '/documents/save-to',
    { blobPath, to, ...(rules !== null ? { rules } : {}) },
    { timeout: 30_000 },
  )
  return data
}

// ─── TO revision ─────────────────────────────────────────────────────────────

export interface ReviseTOResponse {
  to: Record<string, unknown>
}

/**
 * Revise an existing Training Outline in-place using a user-supplied prompt.
 * Sends the current TO JSON + the user's instruction to the LLM and returns
 * the revised TO. Does NOT re-run A0 or regenerate from source documents.
 */
export async function reviseTO(
  currentTo: Record<string, unknown>,
  revisionPrompt: string,
): Promise<ReviseTOResponse> {
  const { data } = await apiClient.post<ReviseTOResponse>(
    '/documents/revise-to',
    { currentTo, revisionPrompt },
    { timeout: 5 * 60 * 1_000 },
  )
  return data
}

// ─── Source analysis ───────────────────────────────────────────────────────────

export interface AnalyzeSourcePayload {
  blobPath: string
  sourceRole?: SourceRole
  extractHint?: string
  /** @deprecated inferred server-side from sourceRole when omitted */
  importance?: ImportanceLevel
}

/**
 * Extract the TOC from an uploaded document and run LLM source analysis.
 * Call this for every uploaded source document before POST /documents/generate-to.
 * Returns a SourceAnalysis object that should be aggregated and passed to
 * generate-to as `sourceAnalyses`.
 */
export async function analyzeSource(payload: AnalyzeSourcePayload): Promise<SourceAnalysis> {
  const { data } = await apiClient.post<SourceAnalysis>(
    '/documents/analyze-source',
    payload,
    { timeout: 60_000 },
  )
  return data
}
