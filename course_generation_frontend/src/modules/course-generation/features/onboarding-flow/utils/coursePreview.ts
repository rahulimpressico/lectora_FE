import type { JsonObject } from '../../../types'
import { TOPIC_KEYS } from '../constants/coursePreview'

export function getSections(toData: JsonObject): JsonObject[] {
  const s = toData.sections ?? toData.modules
  return Array.isArray(s) ? (s as JsonObject[]) : []
}

export function getSectionTitle(section: JsonObject): string {
  return (
    (section.title as string | undefined) ??
    (section.name as string | undefined) ??
    'Untitled Section'
  )
}

export function getSectionMeta(section: JsonObject): string {
  const wc = section.word_count ?? section.wordCount
  const mins = section.minutes ?? section.duration_minutes
  const parts: string[] = []
  if (typeof wc === 'number') parts.push(`${wc.toLocaleString()} words`)
  if (typeof mins === 'number') parts.push(`${mins} min`)
  return parts.join(' · ')
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function getSectionTopics(section: JsonObject): string[] {
  for (const key of TOPIC_KEYS) {
    if (!(key in section)) continue
    const val = section[key]
    if (typeof val === 'string') return val ? [val] : []
    if (Array.isArray(val)) {
      return (val as unknown[])
        .map((item) => {
          if (typeof item === 'string') return item
          if (item !== null && typeof item === 'object') {
            const obj = item as JsonObject
            for (const k of ['title', 'name', 'topic', 'sub_topic', 'label', 'text']) {
              if (typeof obj[k] === 'string' && obj[k]) return obj[k] as string
            }
          }
          return ''
        })
        .filter(Boolean)
    }
  }
  return []
}
