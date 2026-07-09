import apiClient from '@/api/client'
import { ApiClientError } from '@/api/errors'
import type {
  BrowseSourceDirectoryResponse,
  IngestionStatusResponse,
  UploadDocumentResponse,
} from '../types'

export async function uploadDocument(
  file: File,
  courseTopic: string,
): Promise<UploadDocumentResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('courseTopic', courseTopic.trim())
  const { data } = await apiClient.post<UploadDocumentResponse>('/documents/upload', form, {
    // Large PDFs can take several minutes on slower networks / disks.
    timeout: 10 * 60 * 1_000,
  })
  return data
}


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


export async function browseSourceDirectory(
  prefix: string,
  signal?: AbortSignal,
): Promise<BrowseSourceDirectoryResponse> {
  const { data } = await apiClient.get<BrowseSourceDirectoryResponse>(
    '/storage/uploaded-documents/browse',
    { params: { prefix }, signal },
  )
  return data
}
