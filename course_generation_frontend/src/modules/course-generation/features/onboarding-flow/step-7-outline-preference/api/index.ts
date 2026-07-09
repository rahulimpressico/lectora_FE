import apiClient from '@/api/client'
import type {
  GenerateTimedOutlineBody,
  GenerateTimedOutlineResponse,
  RegenerateTimedOutlineBody,
  RegenerateTimedOutlineResponse,
  SaveTOResponse,
  UploadTimedOutlineResponse,
} from '../types'

// ─── Generate ──────────────────────────────────────────────────────────────────

export async function generateTimedOutline(
  body: GenerateTimedOutlineBody,
): Promise<GenerateTimedOutlineResponse> {
  const { data } = await apiClient.post<GenerateTimedOutlineResponse>(
    '/documents/generate-timed-outline',
    body,
    { timeout: 5 * 60 * 1_000 },
  )
  return data
}

// ─── Regenerate ────────────────────────────────────────────────────────────────

export async function regenerateTimedOutline(
  body: RegenerateTimedOutlineBody,
): Promise<RegenerateTimedOutlineResponse> {
  const { data } = await apiClient.post<RegenerateTimedOutlineResponse>(
    '/documents/regenerate-timed-outline',
    body,
    { timeout: 5 * 60 * 1_000 },
  )
  return data
}

// ─── Upload ────────────────────────────────────────────────────────────────────

/**
 * Upload a DOCX/PDF outline document and extract its timed outline (static
 * prompt, no course metadata) in one call. Returns the TO/rules JSON directly.
 */
export async function uploadTimedOutline(file: File): Promise<UploadTimedOutlineResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post<UploadTimedOutlineResponse>('/documents/upload-to', form, {
    // Large PDFs / DOCX outlines can take a while to extract via the LLM.
    timeout: 5 * 60 * 1_000,
  })
  return data
}

// ─── Persistence ───────────────────────────────────────────────────────────────


export async function saveTrainingOutline(
  blobPath: string,
  to: Record<string, unknown>,
  rules: Record<string, unknown> | null,
): Promise<SaveTOResponse> {
  const { data } = await apiClient.post<SaveTOResponse>(
    '/documents/save-to',
    { blobPath, to, ...(rules !== null ? { rules } : {}) },
    { timeout: 30_000 },
  )
  return data
}

// ─── Cancel ─────────────────────────────────────────────────────────────────────

export async function cancelGenerateTO(jobId: string): Promise<void> {
  await apiClient.post(`/documents/generate-to/jobs/${jobId}/cancel`, null, { timeout: 10_000 })
}
