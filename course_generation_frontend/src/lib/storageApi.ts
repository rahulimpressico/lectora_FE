import axiosInstance from '@/services/axiosInstance'

export type StorageSource = 'artifacts' | 'uploads'

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
    source === 'uploads' ? '/storage/uploads/browse' : '/storage/browse'
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

export async function fetchStorageFileText(
  path: string,
  source: StorageSource,
): Promise<string> {
  const { data } = await axiosInstance.get<string>(storageFileApiPath(path, source), {
    responseType: 'text',
  })
  return data
}
