import axiosInstance from '@/services/axiosInstance'
import type {
  GenerateCoursePayload,
  GenerateTOJobAccepted,
  GenerateTOJobPollResponse,
  GenerateTOResponse,
  JobDetail,
} from '../types'
import type { CourseContent } from '../types/editor'
import type { AIOperationRequest, AIOperationResponse } from '../types/editor'

const POLL_INTERVAL_MS = 1_000
const POLL_MAX_MS = 15 * 60 * 1_000

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

// ─── API surface ──────────────────────────────────────────────────────────────
export const courseApi = {
  // ── Document upload ──────────────────────────────────────────────────────────
  uploadDocument: async (file: File): Promise<{ blobPath: string }> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await axiosInstance.post<{ blobPath: string }>(
      '/documents/upload',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data
  },

  // ── Training Outline generation (A0) ─────────────────────────────────────────
  generateTO: async (
    blobPath: string,
    signal?: AbortSignal,
    difficulty = 'intermediate',
  ): Promise<GenerateTOResponse> => {
    const { data: start } = await axiosInstance.post<
      GenerateTOResponse | GenerateTOJobAccepted
    >(
      '/documents/generate-to',
      { blobPath, difficulty },
      { signal, timeout: 60_000 },
    )

    if (isCompletedResponse(start)) return start

    const jobId = start.jobId
    const deadline = Date.now() + POLL_MAX_MS

    while (Date.now() < deadline) {
      const { data: poll } = await axiosInstance.get<GenerateTOJobPollResponse>(
        `/documents/generate-to/jobs/${jobId}`,
        { signal, timeout: 30_000 },
      )
      if (poll.status === 'completed') {
        if (!poll.to || !poll.rules)
          throw new Error('A0 finished but response is missing TO or rules.')
        return { to: poll.to, rules: poll.rules, toBlobPath: poll.toBlobPath }
      }
      if (poll.status === 'failed')
        throw new Error(poll.error ?? poll.message ?? 'A0 generation failed.')
      await sleep(POLL_INTERVAL_MS, signal)
    }

    throw new Error('Timed out waiting for Training Outline generation. Try again.')
  },

  // ── Job lifecycle ────────────────────────────────────────────────────────────
  createJob: async (payload: GenerateCoursePayload): Promise<{ jobId: string }> => {
    const { data } = await axiosInstance.post<{ jobId: string }>('/jobs', payload)
    return data
  },

  /** Full job detail including per-stage progress — matches backend JobDetailResponse. */
  getJobDetail: async (jobId: string): Promise<JobDetail> => {
    const { data } = await axiosInstance.get<JobDetail>(`/jobs/${jobId}`)
    return data
  },

  retryJob: async (
    jobId: string,
    fromStage: string,
  ): Promise<{ jobId: string; status: string }> => {
    const { data } = await axiosInstance.post(`/jobs/${jobId}/retry`, {
      fromStage,
    })
    return data
  },

  getArtifacts: async (
    jobId: string,
  ): Promise<{ artifactUrl: string; filename: string }[]> => {
    const { data } = await axiosInstance.get(`/jobs/${jobId}/artifacts`)
    return data
  },

  // ── Course content for the editor ────────────────────────────────────────────
  getCourseContent: async (jobId: string): Promise<CourseContent> => {
    const { data } = await axiosInstance.get<CourseContent>(
      `/jobs/${jobId}/course`,
      { timeout: 15_000 },
    )
    return data
  },

  // ── AI section operations ────────────────────────────────────────────────────
  performAIOperation: async (
    req: AIOperationRequest,
  ): Promise<AIOperationResponse> => {
    const { data } = await axiosInstance.post<AIOperationResponse>(
      `/jobs/${req.jobId}/ai`,
      { sectionId: req.sectionId, operation: req.operation, content: req.content },
      { timeout: 60_000 },
    )
    return data
  },

  // ── Artifact download ─────────────────────────────────────────────────────────
  /**
   * Downloads the generated study guide DOCX.
   * Handles two response shapes:
   *   - Local dev: FileResponse (binary blob)
   *   - Production: JSON { url: string } (signed blob URL)
   */
  downloadCourseArtifact: async (jobId: string): Promise<void> => {
    try {
      const { data, headers } = await axiosInstance.get(
        `/jobs/${jobId}/artifacts/download`,
        { responseType: 'blob' },
      )
      const contentType = String(headers['content-type'] ?? '')

      if (contentType.includes('application/json')) {
        // Production: JSON response with a signed URL
        const text = await (data as Blob).text()
        const json = JSON.parse(text) as { url?: string }
        if (json.url) window.open(json.url, '_blank')
      } else {
        // Local dev: binary DOCX blob — trigger browser download
        const blobUrl = URL.createObjectURL(data as Blob)
        const anchor = document.createElement('a')
        anchor.href = blobUrl
        anchor.download = `course_${jobId}.docx`
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        URL.revokeObjectURL(blobUrl)
      }
    } catch {
      console.warn('Could not download artifact for job', jobId)
    }
  },
}

