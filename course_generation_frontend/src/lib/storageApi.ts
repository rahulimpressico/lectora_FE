import axiosInstance from '@/services/axiosInstance'

export type StorageSource = 'artifacts' | 'uploads'

/** Optional virtual prefix stripped from browse paths (container is uploaded-documents). */
export const UPLOAD_BLOB_ROOTS = ['uploaded-documents'] as const

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
}

/** Path for axios (baseURL is already `/api`). */
export function storageFileApiPath(path: string, source: StorageSource): string {
  const params = new URLSearchParams({ path, source })
  return `/storage/file?${params.toString()}`
}

/** Full URL for <img src> / <a href> (browser, not axios). */
export function storageFileUrl(path: string, source: StorageSource): string {
  return `/api${storageFileApiPath(path, source)}`
}

export async function browseStorage(
  prefix: string,
  source: StorageSource,
  signal?: AbortSignal,
): Promise<BrowseResponse> {
  const url =
    source === 'uploads'
      ? '/storage/uploaded-documents/browse'
      : '/storage/browse'
  const { data } = await axiosInstance.get<BrowseResponse>(url, {
    params: { prefix },
    signal,
  })
  return data
}

export async function fetchStorageFileBlob(
  path: string,
  source: StorageSource,
): Promise<Blob> {
  const { data, headers } = await axiosInstance.get<Blob>(
    storageFileApiPath(path, source),
    { responseType: 'blob' },
  )
  const contentType = headers['content-type'] ?? ''
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

export interface DeleteStorageFileResult {
  path: string
  ok: boolean
  error?: string | null
}

export interface DeleteStorageFilesResponse {
  results: DeleteStorageFileResult[]
  deletedCount: number
}

export async function deleteStorageFiles(
  paths: string[],
  folderPaths: string[],
  source: StorageSource,
): Promise<DeleteStorageFilesResponse> {
  const { data } = await axiosInstance.post<DeleteStorageFilesResponse>(
    '/storage/delete',
    { paths, folderPaths, source },
  )
  return data
}

export async function fetchStorageFileText(
  path: string,
  source: StorageSource,
): Promise<string> {
  const { data } = await axiosInstance.get<string>(storageFileApiPath(path, source), {
    responseType: 'text',
  })
  return data
}
