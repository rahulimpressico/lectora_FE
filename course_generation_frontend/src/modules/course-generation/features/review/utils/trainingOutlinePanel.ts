import type { JsonObject } from '../../../types'

/** TO fields hidden in the three-panel JSON editor, at any nesting depth. */
export const TO_PANEL_HIDDEN_KEYS = new Set([
  'topic',
  'category',
  'llm_reasoning',
  'source_documents',
  'source_files',
])

/** Root-level TO fields shown read-only (sourced from onboarding, not LLM). */
export const TO_PANEL_READONLY_KEYS = new Set(['course_type', 'course_code'])

export function normalizeTrainingOutlineForPanel(
  to: JsonObject,
  courseTypeHint: string,
  courseCode?: string | null,
): JsonObject {
  const normalized = { ...to }
  delete normalized.topic
  delete normalized.category
  delete normalized.llm_reasoning
  // The backend TO response includes its own internal `course_id` — replace
  // it with the human-readable course code the app already tracks.
  delete normalized.course_id
  if (courseTypeHint.trim()) {
    normalized.course_type = courseTypeHint.trim()
  }
  if (courseCode?.trim()) {
    normalized.course_code = courseCode.trim()
  }
  return normalized
}
