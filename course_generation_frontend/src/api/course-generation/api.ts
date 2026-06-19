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
 * Returns the blob path and upload folder for downstream use.
 *
 * Note: do NOT set Content-Type manually — Axios auto-sets multipart/form-data
 * with the correct boundary when a FormData body is detected.
 */
export async function uploadDocument(
  file: File,
  courseTopic: string,
): Promise<{ blobPath: string; uploadFolder: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('courseTopic', courseTopic.trim())
  const { data } = await apiClient.post<{ blobPath: string; uploadFolder: string }>(
    '/documents/upload',
    form,
    {
      // Large PDFs can take several minutes on slower networks / disks.
      timeout: 10 * 60 * 1_000,
    },
  )
  return data
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
}

/** AI-generate measurable learning objectives from course metadata. */
export async function generateLearningObjectives(
  body: GenerateLearningObjectivesBody,
): Promise<{ learningObjectives: string[] }> {
  const { data } = await apiClient.post<{ learningObjectives: string[] }>(
    '/documents/generate-learning-objectives',
    body,
    { timeout: 60_000 },
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
