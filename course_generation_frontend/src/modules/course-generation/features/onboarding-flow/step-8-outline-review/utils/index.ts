import { getSectionTitleKey, getStr } from '../../../review/components/training-outline/helpers'
import type { JsonObject } from '../../../../types'
import { SECTIONS_KEYS } from '../constants'

export function resolveSectionsKey(data: JsonObject): (typeof SECTIONS_KEYS)[number] {
  for (const key of SECTIONS_KEYS) {
    if (Array.isArray(data[key])) return key
  }
  return 'sections'
}

export function getOutlineSections(data: JsonObject): JsonObject[] {
  const key = resolveSectionsKey(data)
  const arr = data[key]
  return Array.isArray(arr) ? (arr as JsonObject[]) : []
}

export function getSectionTitle(section: JsonObject): string {
  const titleKey = getSectionTitleKey(section)
  return getStr(section, titleKey) || 'Untitled Section'
}

export function getSectionMeta(section: JsonObject): string {
  const wc = section.word_count ?? section.wordCount
  const mins = section.minutes ?? section.duration_minutes
  const ch = section.credit_hours ?? section.credit_hour
  const parts: string[] = []
  if (typeof wc === 'number') parts.push(`${wc.toLocaleString()} words`)
  if (typeof mins === 'number') parts.push(`${mins} min`)
  if (typeof ch === 'number') parts.push(`${ch.toFixed(2)} CE hrs`)
  return parts.join(' · ')
}
