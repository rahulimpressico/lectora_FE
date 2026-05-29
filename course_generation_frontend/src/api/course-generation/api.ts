/**
 * api/course-generation/api.ts
 *
 * Document upload and Training Outline (TO) generation.
 * Covers the upload phase and TO async-poll flow.
 */
import apiClient from '@/api/client'
import type {
  GenerateTOJobAccepted,
  GenerateTOJobPollResponse,
  GenerateTOResponse,
} from '@/modules/course-generation/types'

// ─── Internal helpers ─────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 1_000
const POLL_MAX_MS = 15 * 60 * 1_000
const GENERATE_TO_START_TIMEOUT_MS = 10 * 60 * 1_000

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

/**
 * Generate a Training Outline from one or more uploaded documents.
 *
 * The backend may return the result immediately (200) or accept the job
 * asynchronously (202). When async, this function polls until completion.
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
): Promise<GenerateTOResponse> {
  const paths = Array.isArray(blobPaths) ? blobPaths : [blobPaths]
  const body: Record<string, unknown> = { blobPaths: paths, difficulty }

  if (customToPrompt?.trim()) body.customToPrompt = customToPrompt.trim()
  if (courseTypeHint?.trim()) body.courseTypeHint = courseTypeHint.trim()
  if (toDocBlobPath) body.toDocBlobPath = toDocBlobPath
  if (durationHours != null) body.durationHours = durationHours
  if (difficultyLevel) body.difficultyLevel = difficultyLevel
  if (calculatedWordCount != null) body.calculatedWordCount = calculatedWordCount

  const { data: start } = await apiClient.post<GenerateTOResponse | GenerateTOJobAccepted>(
    '/documents/generate-to',
    body,
    { signal, timeout: GENERATE_TO_START_TIMEOUT_MS },
  )

  if (isCompletedResponse(start)) return start

  const jobId = start.jobId
  const deadline = Date.now() + POLL_MAX_MS

  while (Date.now() < deadline) {
    const { data: poll } = await apiClient.get<GenerateTOJobPollResponse>(
      `/documents/generate-to/jobs/${jobId}`,
      { signal, timeout: 30_000 },
    )
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
