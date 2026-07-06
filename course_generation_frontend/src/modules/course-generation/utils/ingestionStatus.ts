import type { IngestionStatus, UploadedFile } from '../types'

/** Backend status when indexing was skipped or failed — blocks wizard progression. */
export const SKIP_INDEX_INGESTION_STATUS = 'failed' as const satisfies IngestionStatus

export const SKIP_INDEX_BLOCK_MESSAGE =
  'One or more files could not be indexed. Please either re-upload the file(s) or remove them before proceeding.'

export function isSkipIndexStatus(status: IngestionStatus | undefined): boolean {
  return status === SKIP_INDEX_INGESTION_STATUS
}

export function hasSkipIndexFiles(files: UploadedFile[]): boolean {
  return files.some(
    (file) => file.status === 'success' && isSkipIndexStatus(file.ingestionStatus),
  )
}
