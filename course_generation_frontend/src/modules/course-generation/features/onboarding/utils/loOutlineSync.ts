import type { JsonObject } from '../../../types'

export interface HighlightedField {
  type: 'objective' | 'chapter' | 'subtopic'
  index: number
  message: string
}

export interface OutlineChapterView {
  /** 1-based chapter number for display */
  chapterNumber: number
  title: string
  subtopics: string[]
  missingFields: string[]
  /** 1-based LO numbers mapped to this chapter */
  mappedObjectives: number[]
}

export interface LoSyncResult {
  success: boolean
  summary: string
  objectivesCount: number
  chapters: OutlineChapterView[]
  errors: string[]
  warnings: string[]
  highlightedFields: HighlightedField[]
  outlineInvalidated: boolean
  objectivesChanged: boolean
}

const TITLE_KEYS = ['title', 'name', 'section_title', 'topic_title', 'heading'] as const
const SUBTOPIC_KEYS = ['subtopics', 'sub_topics', 'subtopic', 'sub_topic'] as const

function normalizeObjectiveText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

function objectivesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, index) => normalizeObjectiveText(item) === normalizeObjectiveText(b[index] ?? ''))
}

function getSectionTitle(section: JsonObject): string {
  for (const key of TITLE_KEYS) {
    const value = section[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function getSubtopics(section: JsonObject): string[] {
  for (const key of SUBTOPIC_KEYS) {
    const value = section[key]
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }
  return []
}

export function getOutlineSections(toData: JsonObject | null): JsonObject[] {
  if (!toData) return []
  const sections = toData.sections ?? toData.modules
  return Array.isArray(sections) ? (sections as JsonObject[]) : []
}

/** Validate LO list before allowing wizard progression. */
export function validateLearningObjectives(objectives: string[]): {
  valid: boolean
  errors: string[]
  warnings: string[]
  highlightedFields: HighlightedField[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const highlightedFields: HighlightedField[] = []

  if (objectives.length === 0) {
    errors.push('At least one learning objective is required.')
    return { valid: false, errors, warnings, highlightedFields }
  }

  const seen = new Set<string>()
  objectives.forEach((objective, index) => {
    const trimmed = objective.trim()
    const displayIndex = index + 1

    if (!trimmed) {
      errors.push(`Objective ${displayIndex} is empty.`)
      highlightedFields.push({ type: 'objective', index: displayIndex, message: 'Empty objective' })
      return
    }

    if (trimmed.length < 12) {
      warnings.push(`Objective ${displayIndex} is very short — consider expanding it.`)
      highlightedFields.push({ type: 'objective', index: displayIndex, message: 'Very short objective' })
    }

    const key = normalizeObjectiveText(trimmed)
    if (seen.has(key)) {
      warnings.push(`Objective ${displayIndex} duplicates another objective.`)
      highlightedFields.push({ type: 'objective', index: displayIndex, message: 'Duplicate objective' })
    }
    seen.add(key)
  })

  if (objectives.length < 3) {
    warnings.push('Courses typically need at least 3 learning objectives.')
  } else if (objectives.length > 8) {
    warnings.push('More than 8 objectives may be hard to cover in a single course.')
  }

  return { valid: errors.length === 0, errors, warnings, highlightedFields }
}

/** Validate outline chapters/subtopics; chapter numbers are always 1-based in UI. */
export function validateOutlineStructure(toData: JsonObject | null): {
  valid: boolean
  chapters: OutlineChapterView[]
  errors: string[]
  warnings: string[]
  highlightedFields: HighlightedField[]
} {
  const sections = getOutlineSections(toData)
  const errors: string[] = []
  const warnings: string[] = []
  const highlightedFields: HighlightedField[] = []

  if (sections.length === 0) {
    return { valid: true, chapters: [], errors, warnings, highlightedFields }
  }

  const chapters: OutlineChapterView[] = sections.map((section, index) => {
    const chapterNumber = index + 1
    const title = getSectionTitle(section)
    const subtopics = getSubtopics(section)
    const missingFields: string[] = []

    if (!title) {
      missingFields.push('chapter name')
      errors.push(`Chapter ${chapterNumber} is missing a title.`)
      highlightedFields.push({ type: 'chapter', index: chapterNumber, message: 'Missing chapter title' })
    } else if (/^\s*0(\.|$)/.test(title)) {
      warnings.push(`Chapter ${chapterNumber} title starts with 0 — numbering should begin at 1.`)
      highlightedFields.push({ type: 'chapter', index: chapterNumber, message: 'Chapter numbering should start at 1' })
    }

    if (subtopics.length === 0) {
      missingFields.push('subtopics')
      warnings.push(`Chapter ${chapterNumber} has no subtopics.`)
      highlightedFields.push({ type: 'subtopic', index: chapterNumber, message: 'No subtopics listed' })
    } else {
      subtopics.forEach((subtopic, subIndex) => {
        if (!subtopic.trim()) {
          errors.push(`Chapter ${chapterNumber}, subtopic ${subIndex + 1} is empty.`)
          highlightedFields.push({
            type: 'subtopic',
            index: chapterNumber,
            message: `Empty subtopic ${subIndex + 1}`,
          })
        }
      })
    }

    return {
      chapterNumber,
      title: title || `Chapter ${chapterNumber}`,
      subtopics,
      missingFields,
      mappedObjectives: [],
    }
  })

  return {
    valid: errors.length === 0,
    chapters,
    errors,
    warnings,
    highlightedFields,
  }
}

/** Distribute LOs across chapters evenly (1-based objective numbers returned). */
export function mapObjectivesToChapters(
  objectives: string[],
  chapters: OutlineChapterView[],
): OutlineChapterView[] {
  if (chapters.length === 0 || objectives.length === 0) {
    return chapters.map((chapter) => ({ ...chapter, mappedObjectives: [] }))
  }

  return chapters.map((chapter, chapterIndex) => {
    const mappedObjectives: number[] = []
    objectives.forEach((_, loIndex) => {
      if (loIndex % chapters.length === chapterIndex) {
        mappedObjectives.push(loIndex + 1)
      }
    })
    return { ...chapter, mappedObjectives }
  })
}

export interface RunLoOutlineSyncInput {
  objectives: string[]
  previousObjectives: string[]
  toData: JsonObject | null
  outlineInvalidated?: boolean
}

/** Main sync entry — parse/validate LOs, map to outline, produce status log. */
export function runLoOutlineSync(input: RunLoOutlineSyncInput): LoSyncResult {
  const {
    objectives,
    previousObjectives,
    toData,
    outlineInvalidated = false,
  } = input

  const objectivesChanged = !objectivesEqual(objectives, previousObjectives)
  const loValidation = validateLearningObjectives(objectives)
  const outlineValidation = validateOutlineStructure(toData)

  let chapters = outlineValidation.chapters
  if (chapters.length > 0 && objectives.length > 0) {
    chapters = mapObjectivesToChapters(objectives, chapters)
  }

  const errors = [...loValidation.errors, ...outlineValidation.errors]
  const warnings = [...loValidation.warnings, ...outlineValidation.warnings]
  const highlightedFields = [...loValidation.highlightedFields, ...outlineValidation.highlightedFields]

  const success = loValidation.valid && outlineValidation.valid
  const objectivesCount = objectives.length
  const chapterCount = chapters.length

  let summary: string
  if (!success) {
    summary = `Validation failed — ${errors.length} error${errors.length !== 1 ? 's' : ''} found.`
  } else if (outlineInvalidated) {
    summary =
      chapterCount > 0
        ? `Learning objectives updated — structure invalidated (${chapterCount} chapter${chapterCount !== 1 ? 's' : ''} will regenerate).`
        : `Learning objectives updated (${objectivesCount}) — structure will regenerate on the next step.`
  } else if (objectivesChanged) {
    summary =
      chapterCount > 0
        ? `Updated ${objectivesCount} objective${objectivesCount !== 1 ? 's' : ''} and mapped to ${chapterCount} chapter${chapterCount !== 1 ? 's' : ''}.`
        : `Updated ${objectivesCount} learning objective${objectivesCount !== 1 ? 's' : ''}.`
  } else {
    summary = `${objectivesCount} learning objective${objectivesCount !== 1 ? 's' : ''} ready.`
  }

  return {
    success,
    summary,
    objectivesCount,
    chapters,
    errors,
    warnings,
    highlightedFields,
    outlineInvalidated,
    objectivesChanged,
  }
}

/** Apply LO text to objectives array with parse feedback. */
export function parseObjectivesWithFeedback(
  text: string,
  parseFn: (value: string) => string[],
): { objectives: string[]; error: string | null; warning: string | null } {
  const trimmed = text.trim()
  if (!trimmed) {
    return { objectives: [], error: 'Paste or type learning objectives before parsing.', warning: null }
  }

  const objectives = parseFn(trimmed)
  if (objectives.length === 0) {
    return {
      objectives: [],
      error: 'Could not detect separate objectives. Try numbered lines (1. …), bullets, or semicolons.',
      warning: null,
    }
  }

  if (objectives.length === 1 && trimmed.length > 120) {
    return {
      objectives,
      warning: 'Only one objective detected from a long block — split into multiple items if needed.',
      error: null,
    }
  }

  return { objectives, error: null, warning: null }
}
