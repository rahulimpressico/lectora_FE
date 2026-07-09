import apiClient from '@/api/client'
import type {
  GenerateTimedOutlineBody,
  GenerateTimedOutlineResponse,
  RegenerateTimedOutlineBody,
  RegenerateTimedOutlineResponse,
  UploadTimedOutlineResponse,
} from '../types'

// ─── Generate ──────────────────────────────────────────────────────────────────

export async function generateTimedOutline(
  body: GenerateTimedOutlineBody,
  signal?: AbortSignal,
): Promise<GenerateTimedOutlineResponse> {
  const { data } = await apiClient.post<GenerateTimedOutlineResponse>(
    "/documents/generate-to",
    body,
    { timeout: 5 * 60 * 1_000, signal },
  );
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



/** Cancel the in-flight generate-to request on the backend (best-effort, fire-and-forget). */
export async function cancelGenerateTO(): Promise<void> {
  await apiClient.post('/documents/generate-to/cancel', null, { timeout: 10_000 })
}