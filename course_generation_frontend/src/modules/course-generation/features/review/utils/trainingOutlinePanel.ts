import type { JsonObject } from '../../../types'

/** Root-level TO fields hidden in the three-panel JSON editor. */
export const TO_PANEL_HIDDEN_KEYS = new Set(['topic', 'category', 'llm_reasoning'])

/** Root-level TO fields shown read-only (sourced from onboarding, not LLM). */
export const TO_PANEL_READONLY_KEYS = new Set(['course_type'])

export function normalizeTrainingOutlineForPanel(
  to: JsonObject,
  courseTypeHint: string,
): JsonObject {
  const normalized = { ...to }
  delete normalized.topic
  delete normalized.category
  delete normalized.llm_reasoning
  if (courseTypeHint.trim()) {
    normalized.course_type = courseTypeHint.trim()
  }
  return normalized
}
