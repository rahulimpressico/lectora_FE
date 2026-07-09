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
    '/documents/generate-recommended-topics',
    body,
    { timeout: 60_000 },
  )
  return data
}

// ─── Regenerate ────────────────────────────────────────────────────────────────

/** Revise existing required topics based on user feedback. */
export async function regenerateRequiredTopics(
  body: RegenerateRequiredTopicsBody,
): Promise<RegenerateRequiredTopicsResponse> {
  const { data } = await apiClient.post<RegenerateRequiredTopicsResponse>(
    '/documents/regenerate-recommended-topics',
    body,
    { timeout: 60_000 },
  )
  return data
}
