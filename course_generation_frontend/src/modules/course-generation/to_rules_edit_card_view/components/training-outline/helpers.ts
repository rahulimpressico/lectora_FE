import type { JsonObject, JsonValue } from '../../../../../types'

export const detectKey = (obj: JsonObject, ...candidates: string[]): string => {
  for (const k of candidates) {
    if (k in obj) return k
  }
  return candidates[0]
}

export const getStr = (obj: JsonObject, ...candidates: string[]): string => {
  for (const k of candidates) {
    const v = obj[k]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

export const getNum = (obj: JsonObject, ...candidates: string[]): number => {
  for (const k of candidates) {
    const v = Number(obj[k])
    if (!isNaN(v) && v > 0) return v
  }
  return 0
}

export const getSections = (data: JsonObject): JsonObject[] => {
  const s = data.sections
  if (Array.isArray(s)) return s as JsonObject[]
  return []
}

export const getSectionTitleKey = (section: JsonObject): string =>
  detectKey(section, 'title', 'section_title', 'name')

export const getSectionSubTopicsKey = (section: JsonObject): string =>
  detectKey(
    section,
    'sub_topics', 'subtopics', 'sub_topic', 'subtopic',
    'topics', 'topic_list', 'sub_title', 'subtitle', 'primary_topic',
  )

export const getSectionSubTopics = (section: JsonObject): string[] => {
  const key = getSectionSubTopicsKey(section)
  if (!(key in section)) return []
  const val = section[key]
  if (typeof val === 'string') return val ? [val] : []
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === 'string') return item
        if (item !== null && typeof item === 'object') {
          return getStr(item as JsonObject, 'title', 'name', 'topic', 'sub_topic', 'label')
        }
        return String(item)
      })
      .filter((s) => s.length > 0)
  }
  return []
}

export const getObjectivesKey = (data: JsonObject): string =>
  detectKey(data, 'learning_objectives', 'objectives', 'course_objectives')

export const getObjectives = (data: JsonObject): string[] => {
  const key = getObjectivesKey(data)
  const v = data[key]
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
  return []
}

/** Returns the JSON path and numeric value for a totals field.
 *  Supports both nested (`totals.*`) and flat (`total_*`) JSON layouts. */
export const resolveTotalsField = (
  data: JsonObject,
  field: 'word_count' | 'minutes' | 'credit_hours',
): { path: string[]; value: number } => {
  const hasTotalsObj = 'totals' in data && data.totals !== null && typeof data.totals === 'object'
  if (hasTotalsObj) {
    const totals = data.totals as JsonObject
    return { path: ['totals', field], value: getNum(totals, field) }
  }
  return { path: [`total_${field}`], value: getNum(data, `total_${field}`) }
}

// ── Types also needed by steps ─────────────────────────────────────────────────
export type { JsonObject, JsonValue }
