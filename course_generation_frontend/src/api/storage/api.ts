/**
 * api/storage/api.ts
 *
 * File storage browsing, previewing, downloading, and deletion.
 * Used by Asset Library, Documents Library, and inline Azure browser.
 */
import { API_BASE_URL } from '@/config/api'
import apiClient from '@/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StorageSource =
  | 'artifacts'
  | 'uploads'
  | 'generated-courses'
  | 'course-generation-artifacts'
export type StorageCategory =
  | 'source-documents'
  | 'generated-courses'
  | 'pipeline-artifacts'
  | 'course-generation-artifacts'
  | 'test-data'

export const UPLOAD_BLOB_ROOTS = ['uploaded-documents'] as const

export interface StorageEntry {
  name: string
  path: string
  entryType: 'folder' | 'file'
  size?: number
  lastModified?: string
  contentType?: string
  fileCount?: number
  extension?: string
}

export interface BrowseResponse {
  prefix: string
  entries: StorageEntry[]
  totalFiles: number
  totalFolders: number
  totalSize: number
  source: 'azure' | 'local'
  containerName?: string
}

export interface DeleteStorageFileResult {
  path: string
  ok: boolean
  error?: string | null
}

export interface DeleteStorageFilesResponse {
  results: DeleteStorageFileResult[]
  deletedCount: number
}

export interface ExternalPreviewUrlResponse {
  provider: 'microsoft-office-web-viewer'
  fileUrl: string
  previewUrl: string
  expiresAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip blob root so API prefix is relative (e.g. ``Flood_Insurance/``). */
export function toRelativeUploadPrefix(fullPath: string): string {
  const normalized = fullPath.endsWith('/') ? fullPath : fullPath ? `${fullPath}/` : ''
  for (const root of UPLOAD_BLOB_ROOTS) {
    if (normalized === `${root}/`) return ''
    if (normalized.startsWith(`${root}/`)) {
      return normalized.slice(root.length + 1)
    }
  }
  return normalized
}

/** Relative API path (e.g. `/storage/file?...`) — suitable for axios calls. */
export function storageFileApiPath(path: string, source: StorageSource): string {
  const params = new URLSearchParams({ path, source })
  return `/storage/file?${params.toString()}`
}

/** Full URL for `<img src>` / `<a href>` — bypasses axios (browser-native). */
export function storageFileUrl(path: string, source: StorageSource): string {
  return `${API_BASE_URL}${storageFileApiPath(path, source)}`
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function browseStorage(
  prefix: string,
  source: StorageSource,
  signal?: AbortSignal,
): Promise<BrowseResponse> {
  const url =
    source === 'uploads'
      ? '/storage/uploaded-documents/browse'
      : '/storage/browse'
  const { data } = await apiClient.get<BrowseResponse>(url, {
    params: { prefix },
    signal,
  })
  return data
}

export async function browseStorageCategory(
  category: StorageCategory,
  prefix: string,
  signal?: AbortSignal,
): Promise<BrowseResponse> {
  const { data } = await apiClient.get<BrowseResponse>(
    `/storage/categories/${category}/browse`,
    {
      params: { prefix },
      signal,
    },
  )
  return data
}

export async function fetchStorageFileBlob(
  path: string,
  source: StorageSource,
): Promise<Blob> {
  const { data, headers } = await apiClient.get<Blob>(
    storageFileApiPath(path, source),
    { responseType: 'blob' },
  )
  const rawType = headers['content-type']
  const contentType = typeof rawType === 'string' ? rawType : ''
  if (contentType.includes('application/json') && data.size < 4096) {
    const text = await data.text()
    try {
      const body = JSON.parse(text) as { detail?: string }
      throw new Error(body.detail ?? text)
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e
      throw new Error(text || 'Failed to load file')
    }
  }
  return data
}

export async function fetchStorageFileText(
  path: string,
  source: StorageSource,
): Promise<string> {
  const { data } = await apiClient.get<string>(storageFileApiPath(path, source), {
    responseType: 'text',
  })
  return data
}

export async function fetchExternalPreviewUrl(
  path: string,
  source: Extract<StorageSource, 'uploads' | 'generated-courses'>,
): Promise<ExternalPreviewUrlResponse> {
  const { data } = await apiClient.get<ExternalPreviewUrlResponse>(
    '/storage/external-preview-url',
    { params: { path, source } },
  )
  return data
}

export async function deleteStorageFiles(
  paths: string[],
  folderPaths: string[],
  source: StorageSource,
): Promise<DeleteStorageFilesResponse> {
  const { data } = await apiClient.post<DeleteStorageFilesResponse>(
    '/storage/delete',
    { paths, folderPaths, source },
  )
  return data
}
