/**
 * api/editor/api.ts
 *
 * Course editor operations: loading course content, AI section operations,
 * persisting section edits, and downloading the final DOCX artifact.
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

/**
 * Download the generated study guide DOCX.
 * Handles two response shapes:
 *   - Local dev:  FileResponse (binary blob) → triggers browser download
 *   - Production: JSON { url: string }       → opens signed blob URL
 */
export async function downloadCourseArtifact(jobId: string): Promise<void> {
  const { data, headers } = await apiClient.get(
    `/jobs/${jobId}/artifacts/download`,
    { responseType: 'blob', timeout: LONG_JOB_TIMEOUT_MS },
  )
  const contentType = String(headers['content-type'] ?? '')

  if (contentType.includes('application/json')) {
    const text = await (data as Blob).text()
    const json = JSON.parse(text) as { url?: string }
    if (json.url) window.open(json.url, '_blank')
  } else {
    const blobUrl = URL.createObjectURL(data as Blob)
    const anchor = document.createElement('a')
    anchor.href = blobUrl
    anchor.download = `course_${jobId}.docx`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(blobUrl)
  }
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
