import type { JsonObject, JsonValue } from '../../../types'

/** Per-section/subtopic metric fields the backend sends as numeric strings
 *  (e.g. `"450"`) rather than JSON numbers — coerced here so they render with
 *  the same numeric-value chip styling as the coerced Overview totals. */
const SECTION_METRIC_FIELDS = ['word_count', 'minutes', 'credit_hour', 'credit_hours'] as const

function coerceMetricValue(value: JsonValue): JsonValue {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (trimmed === '') return value
  const num = Number(trimmed)
  return Number.isNaN(num) ? value : num
}

function isPlainObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function coerceSectionMetrics(section: JsonObject): JsonObject {
  const next: JsonObject = { ...section }
  for (const field of SECTION_METRIC_FIELDS) {
    if (field in next) next[field] = coerceMetricValue(next[field])
  }
  if (Array.isArray(next.subtopics)) {
    next.subtopics = next.subtopics.map((sub) => (isPlainObject(sub) ? coerceSectionMetrics(sub) : sub))
  }
  return next
}

/** Coerces stringified word_count/minutes/credit_hour(s) fields on every
 *  section and subtopic into real numbers, for consistent numeric styling. */
function coerceOutlineMetrics(to: JsonObject): JsonObject {
  if (!Array.isArray(to.sections)) return to
  return {
    ...to,
    sections: to.sections.map((section) => (isPlainObject(section) ? coerceSectionMetrics(section) : section)),
  }
}

/** TO fields hidden in the three-panel JSON editor, at any nesting depth.
 *  `totals`/`total_*` are hidden here because their values are surfaced inside
 *  the Overview card instead (see `TOPanel`'s `overviewExtraEntries`). */
export const TO_PANEL_HIDDEN_KEYS = new Set([
  "topic",
  "category",
  "llm_reasoning",
  "source_documents",
  "source_files",
  "totals",
  "total_word_count",
  "total_minutes",
  "total_credit_hours",
  // Internal A0 bookkeeping flags — not meant for user display.
  "_generated_from_source",
  "_dynamic_flow",
  "_calculated_word_count",
]);

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
  return coerceOutlineMetrics(normalized)
}
