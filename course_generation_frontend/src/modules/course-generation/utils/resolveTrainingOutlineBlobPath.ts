import type { UploadedFile } from '../types'

const GENERATED_TO_FILENAME = 'generated_to.json'

function folderFromBlobPath(blobPath: string): string | null {
  const normalized = blobPath.trim().replace(/^uploaded-documents\//, '')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length < 2) return null
  return parts.slice(0, -1).join('/')
}

/**
 * Resolve where the canonical generated TO JSON should be persisted.
 * Reuses an existing backend path when present; otherwise targets
 * `{uploadFolder}/generated_to.json`.
 */
export function resolveTrainingOutlineBlobPath(input: {
  generatedToBlobPath: string | null
  uploadFolder: string | null
  rawDocuments: UploadedFile[]
}): string | null {
  const existing = input.generatedToBlobPath?.trim()
  if (existing) return existing

  const outlineDoc = input.rawDocuments.find(
    (doc) => doc.uploadRole === 'outline' && doc.status === 'success' && doc.blobPath,
  )
  if (outlineDoc?.blobPath) {
    const folder = folderFromBlobPath(outlineDoc.blobPath)
    if (folder) return `${folder}/${GENERATED_TO_FILENAME}`
  }

  const firstSource = input.rawDocuments.find(
    (doc) => doc.status === 'success' && doc.blobPath && doc.uploadRole !== 'outline',
  )
  if (firstSource?.blobPath) {
    const folder = folderFromBlobPath(firstSource.blobPath)
    if (folder) return `${folder}/${GENERATED_TO_FILENAME}`
  }

  const uploadFolder = input.uploadFolder?.trim()
  if (uploadFolder) return `${uploadFolder}/${GENERATED_TO_FILENAME}`

  return null
}
