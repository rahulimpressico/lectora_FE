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

const POLL_INTERVAL_MS = 1_000
const POLL_MAX_MS = 15 * 60 * 1_000
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

function isCompletedResponse(
  data: GenerateTOResponse | GenerateTOJobAccepted,
): data is GenerateTOResponse {
  return 'to' in data && 'rules' in data
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

/**
 * Generate a Training Outline from one or more uploaded documents.
 *
 * The backend may return the result immediately (200) or accept the job
 * asynchronously (202). When async, this function polls until completion.
 *
 * @param onJobIdKnown - Called as soon as the backend's 202-accepted job ID is
 *   known (before polling begins). The caller should store this ID so it can
 *   call `cancelGenerateTO(jobId)` to terminate the A0 run on the server if
 *   the user cancels mid-flight — aborting the signal alone only stops polling,
 *   it does not stop the backend job.
 */
export async function generateTO(
  blobPaths: string | string[],
  signal?: AbortSignal,
  difficulty = 'intermediate',
  customToPrompt?: string,
  courseTypeHint?: string,
  toDocBlobPath?: string,
  durationHours?: number | null,
  difficultyLevel?: string | null,
  calculatedWordCount?: number | null,
  audience?: string,
  onJobIdKnown?: (jobId: string) => void,
): Promise<GenerateTOResponse> {
  const paths = Array.isArray(blobPaths) ? blobPaths : [blobPaths]
  const body: Record<string, unknown> = { blobPaths: paths, difficulty }

  if (customToPrompt?.trim()) body.customToPrompt = customToPrompt.trim()
  if (courseTypeHint?.trim()) body.courseTypeHint = courseTypeHint.trim()
  if (toDocBlobPath) body.toDocBlobPath = toDocBlobPath
  if (durationHours != null) body.durationHours = durationHours
  if (difficultyLevel) body.difficultyLevel = difficultyLevel
  if (calculatedWordCount != null) body.calculatedWordCount = calculatedWordCount
  if (audience?.trim()) body.audience = audience.trim()

  // POST with 503 retry-with-backoff: if the server is temporarily at capacity,
  // wait and retry rather than surfacing an error the user cannot act on.
  // The loop has no termination condition in its head — it exits via:
  //   • break     on a successful response (2xx)
  //   • throw err on any non-503 error, or after all BUSY_RETRY_DELAYS_MS are exhausted
  let start: GenerateTOResponse | GenerateTOJobAccepted
  for (let attempt = 0; ; attempt++) {
    try {
      const { data } = await apiClient.post<GenerateTOResponse | GenerateTOJobAccepted>(
        '/documents/generate-to',
        body,
        { signal, timeout: GENERATE_TO_START_TIMEOUT_MS },
      )
      start = data
      break
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

  if (isCompletedResponse(start)) return start

  const jobId = start.jobId
  onJobIdKnown?.(jobId)
  const deadline = Date.now() + POLL_MAX_MS

  while (Date.now() < deadline) {
    let poll: GenerateTOJobPollResponse
    try {
      const { data } = await apiClient.get<GenerateTOJobPollResponse>(
        `/documents/generate-to/jobs/${jobId}`,
        { signal, timeout: 30_000 },
      )
      poll = data
    } catch (err) {
      // 404 means the server restarted and lost the in-memory job store.
      if (err instanceof ApiClientError && err.status === 404) {
        throw new Error(
          'The server was restarted while the Training Outline was being generated. ' +
          'Please click "Generate TO" again.',
        )
      }
      throw err
    }
    if (poll.status === 'completed') {
      if (!poll.to || !poll.rules)
        throw new Error('A0 finished but response is missing TO or rules.')
      return { to: poll.to, rules: poll.rules, toBlobPath: poll.toBlobPath }
    }
    if (poll.status === 'cancelled')
      throw new Error(poll.error ?? poll.message ?? 'Training outline generation was cancelled.')
    if (poll.status === 'failed')
      throw new Error(poll.error ?? poll.message ?? 'A0 generation failed.')
    await sleep(POLL_INTERVAL_MS, signal)
  }

  throw new Error('Timed out waiting for Training Outline generation. Try again.')
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
