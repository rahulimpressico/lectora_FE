import apiClient from '@/api/client'
import { ApiClientError } from '@/api/errors'
import type {
  BrowseSourceDirectoryResponse,
  IngestionStatusResponse,
  UploadDocumentOptions,
  UploadDocumentResponse,
} from '../types'

/**
 * Upload a single source document (.docx / .pdf / .json Timed Outline) to
 * blob storage under `{courseTopic}/{filename}`. `options` carries optional
 * RAG chunk metadata (courseId, jurisdiction, sourceType, sourcePriority,
 * sourceIntent) forwarded as-is to the backend.
 *
 * Note: do NOT set Content-Type manually — Axios auto-sets multipart/form-data
 * with the correct boundary when a FormData body is detected.
 */
export async function uploadDocument(
  file: File,
  courseTopic: string,
  options: UploadDocumentOptions = {},
): Promise<UploadDocumentResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('courseTopic', courseTopic.trim())
  if (options.courseId) form.append('courseId', options.courseId)
  if (options.jurisdiction) form.append('jurisdiction', options.jurisdiction)
  if (options.sourceType) form.append('sourceType', options.sourceType)
  if (options.sourcePriority) form.append('sourcePriority', options.sourcePriority)
  if (options.sourceIntent) form.append('sourceIntent', options.sourceIntent)
  const { data } = await apiClient.post<UploadDocumentResponse>('/documents/upload', form, {
    // Large PDFs can take several minutes on slower networks / disks.
    timeout: 10 * 60 * 1_000,
  })
  return data
}


/**
 * Poll the backend ingestion status for a document uploaded via `uploadDocument`.
 * Returns null on a 404 — document ID unknown or expired.
 */
export async function getIngestionStatus(documentId: string): Promise<IngestionStatusResponse | null> {
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

/**
 * Non-recursive listing of the folders/files immediately under `prefix`
 * (relative to the uploads root) in Azure Blob Storage or the local dev fallback.
 */
export async function browseSourceDirectory(
  prefix: string,
  signal?: AbortSignal,
): Promise<BrowseSourceDirectoryResponse> {
  const { data } = await apiClient.get<BrowseSourceDirectoryResponse>(
    '/storage/uploaded-documents/browse',
    { params: { prefix }, signal, timeout: 30_000 },
  )
  return data
}
