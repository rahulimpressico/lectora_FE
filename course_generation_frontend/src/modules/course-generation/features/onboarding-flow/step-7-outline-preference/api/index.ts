import apiClient, { LLM_REQUEST_TIMEOUT_MS } from '@/api/client'
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
    "/generate-to",
    body,
    { timeout: LLM_REQUEST_TIMEOUT_MS, signal },
  );
  return data
}

// ─── Regenerate ────────────────────────────────────────────────────────────────

export async function regenerateTimedOutline(
  body: RegenerateTimedOutlineBody,
): Promise<RegenerateTimedOutlineResponse> {
  const { data } = await apiClient.post<RegenerateTimedOutlineResponse>(
    '/regenerate-timed-outline',
    body,
    { timeout: LLM_REQUEST_TIMEOUT_MS },
  )
  return data
}

// ─── Upload ────────────────────────────────────────────────────────────────────

/**
 * Upload a DOCX/PDF outline document and extract its timed outline (static
 * prompt, no course metadata) in one call. Returns the TO/rules JSON directly.
 *
 * TODO: lectora_BE_refine has no `/documents/upload-to` route yet — this has
 * no call sites today, but wire it up backend-side before using it.
 */
export async function uploadTimedOutline(file: File): Promise<UploadTimedOutlineResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post<UploadTimedOutlineResponse>('/documents/upload-to', form, {
    // Large PDFs / DOCX outlines can take a while to extract via the LLM.
    timeout: LLM_REQUEST_TIMEOUT_MS,
  })
  return data
}



/** Cancel the in-flight generate-to request on the backend (best-effort, fire-and-forget). */
export async function cancelGenerateTO(): Promise<void> {
  await apiClient.post('/generate-to/cancel', null, { timeout: 10_000 })
}