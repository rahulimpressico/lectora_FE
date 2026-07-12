/**
 * api/editor/api.ts
 *
 * Course editor operations: loading course content, AI section operations,
 * persisting section edits, and downloading the final DOCX artifact.
 *
 * TODO(lectora_BE_refine): only `getCourseContent` (`GET /jobs/{id}/course`)
 * has a matching route today. `performAIOperation`, `saveSectionContent`,
 * `deleteSectionAPI`, `persistSectionOrder`, `updateCourseTitleAPI`,
 * `syncCourseContent`, `downloadCourseArtifact`, and `saveToAzure` all target
 * routes lectora_BE_refine does not implement yet — these will 404 until the
 * editor/artifact endpoints are added backend-side.
 */
import apiClient from '@/api/client'
import type { CourseContent, AIOperationRequest, AIOperationResponse, SaveToAzureResponse } from '@/modules/course-generation/types/editor'

/** DOCX rebuild + multi-file Azure sync for large courses can exceed 2 minutes. */
const LONG_JOB_TIMEOUT_MS = 10 * 60 * 1_000

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getCourseContent(
  jobId: string,
  courseSlug?: string,
): Promise<CourseContent> {
  const { data } = await apiClient.get<CourseContent>(
    `/jobs/${jobId}/course`,
    {
      params: courseSlug ? { courseSlug } : undefined,
      // Large courses resolved from Azure can take 30s+ on a cold open.
      timeout: 120_000,
    },
  )
  return data
}

export async function performAIOperation(
  req: AIOperationRequest,
): Promise<AIOperationResponse> {
  const { data } = await apiClient.post<AIOperationResponse>(
    `/jobs/${req.jobId}/ai`,
    {
      sectionId: req.sectionId,
      operation: req.operation,
      content: req.content,
      userPrompt: req.userPrompt,
    },
    { timeout: 120_000 },
  )
  return data
}

export async function saveSectionContent(
  jobId: string,
  sectionId: string,
  content: string,
  sectionType?: string,
  title?: string,
): Promise<void> {
  await apiClient.patch(`/jobs/${jobId}/sections/${sectionId}`, {
    content,
    sectionType,
    ...(title !== undefined ? { title } : {}),
  })
}

export async function deleteSectionAPI(jobId: string, sectionId: string): Promise<void> {
  await apiClient.delete(`/jobs/${jobId}/sections/${sectionId}`)
}

export async function persistSectionOrder(jobId: string, sectionOrder: string[]): Promise<void> {
  await apiClient.patch(`/jobs/${jobId}/sections/reorder`, { sectionOrder })
}

export async function updateCourseTitleAPI(jobId: string, courseTitle: string): Promise<void> {
  await apiClient.patch(`/jobs/${jobId}/course`, { courseTitle })
}

export interface SyncCourseResponse {
  jobId: string
  status: 'synced'
  generatedAt: string
  meta: {
    totalWordCount: number
    sectionCount: number
    chapterCount: number
    estimatedReadTime: string
  }
}

/** Bulk-sync the full course tree to the backend. Called before Save to Azure. */
export async function syncCourseContent(
  jobId: string,
  content: CourseContent,
): Promise<SyncCourseResponse> {
  const { data } = await apiClient.post<SyncCourseResponse>(
    `/jobs/${jobId}/course/sync`,
    content,
    { timeout: LONG_JOB_TIMEOUT_MS },
  )
  return data
}

/**
 * Parse a filename from a Content-Disposition header.
 * Supports `filename="…"` and RFC 5987 `filename*=UTF-8''…`.
 */
export function filenameFromContentDisposition(header: string | undefined | null): string | null {
  if (!header) return null

  const star = /filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;\s]+)/i.exec(header)
  if (star?.[1]) {
    const raw = star[1].trim().replace(/^"|"$/g, '')
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }

  const quoted = /filename\s*=\s*"((?:\\.|[^"\\])*)"/i.exec(header)
  if (quoted?.[1]) return quoted[1].replace(/\\"/g, '"')

  const plain = /filename\s*=\s*([^;\s]+)/i.exec(header)
  if (plain?.[1]) return plain[1].replace(/^"|"$/g, '')

  return null
}

/**
 * Render-only DOCX download: POSTs the full editor snapshot to the backend and
 * triggers a browser download from the binary response. Does not sync, persist,
 * or upload to Azure.
 */
export async function downloadCourseArtifact(
  jobId: string,
  snapshot: CourseContent,
): Promise<void> {
  const { data, headers } = await apiClient.post(
    `/jobs/${jobId}/artifacts/render-docx`,
    snapshot,
    { responseType: 'blob', timeout: LONG_JOB_TIMEOUT_MS },
  )
  const blob = data as Blob

  // Empty / tiny payloads are almost never a real DOCX (ZIP header is larger).
  if (blob.size < 100) {
    const text = await blob.text().catch(() => '')
    throw new Error(
      text.trim() || `Download failed: empty or invalid file (${blob.size} bytes)`,
    )
  }

  const fromHeader = filenameFromContentDisposition(
    headers['content-disposition'] ?? headers['Content-Disposition'],
  )
  const filename = fromHeader?.trim() || `course_${jobId}.docx`

  const blobUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Defer revoke — immediate revoke can abort the download in Chrome.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000)
}

export interface SaveToAzureOptions {
  courseTitle?: string
  courseSlug?: string
  /** Flat ordered list of content section IDs (L1 then their L2 children). Backend reorders DOCX accordingly. */
  sectionOrder?: string[]
}

export async function saveToAzure(
  jobId: string,
  options?: SaveToAzureOptions,
): Promise<SaveToAzureResponse> {
  const body: Record<string, unknown> = {}
  if (options?.courseTitle?.trim()) body.courseTitle = options.courseTitle.trim()
  if (options?.courseSlug?.trim()) body.courseSlug = options.courseSlug.trim()
  if (options?.sectionOrder && options.sectionOrder.length > 0) {
    body.sectionOrder = options.sectionOrder
  }

  const { data } = await apiClient.post<SaveToAzureResponse>(
    `/jobs/${jobId}/artifacts/save-to-azure`,
    body,
    { timeout: LONG_JOB_TIMEOUT_MS },
  )
  return data
}
