import apiClient from '@/api/client'
import type {
  GenerateRequiredTopicsBody,
  GenerateRequiredTopicsResponse,
  RegenerateRequiredTopicsBody,
  RegenerateRequiredTopicsResponse,
} from '../types'

// ─── Generate ──────────────────────────────────────────────────────────────────

/** AI-generate the recommended required topics from course metadata. */
export async function generateRequiredTopics(
  body: GenerateRequiredTopicsBody,
): Promise<GenerateRequiredTopicsResponse> {
  const { data } = await apiClient.post<GenerateRequiredTopicsResponse>(
    '/generate-required-topics',
    body,
    { timeout: 60_000 },
  )
  return data
}

// ─── Regenerate ────────────────────────────────────────────────────────────────

/**
 * Revise existing required topics based on user feedback.
 * TODO(lectora_BE_refine): no `/regenerate-recommended-topics` route exists
 * yet (only `/generate-recommended-topics`) — this call will 404.
 */
export async function regenerateRequiredTopics(
  body: RegenerateRequiredTopicsBody,
): Promise<RegenerateRequiredTopicsResponse> {
  const { data } = await apiClient.post<RegenerateRequiredTopicsResponse>(
    '/regenerate-required-topics',
    body,
    { timeout: 60_000 },
  )
  return data
}
