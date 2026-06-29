import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
  convertInchesToTwip,
} from 'docx'
import type { JsonObject, JsonValue } from '../types'

export interface TOExportOptions {
  courseTitle: string
  ruleFamily?: string
  audience?: string
  difficultyLevel?: string | null
  durationHours?: number | null
  description?: string
  objectives?: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FONT = 'Calibri'
const COLOR_NAVY = '1e3a5f'
const COLOR_BLUE = '1d4ed8'
const COLOR_GRAY = '64748b'
const COLOR_DARK = '0f172a'
const COLOR_RULE = 'e2e8f0'
const COLOR_MUTED = '94a3b8'

// Array keys that contain nested outline child items (objects)
const CHILD_OBJECT_ARRAY_KEYS = new Set([
  'sections', 'topics', 'chapters', 'modules',
  'units', 'lessons', 'items', 'sub_sections', 'parts',
])

// Array keys that may contain subtopic strings OR nested objects
const CHILD_ARRAY_KEYS = new Set([
  'sections', 'topics', 'subtopics', 'sub_topics', 'chapters', 'modules',
  'units', 'lessons', 'items', 'sub_sections', 'parts',
])

// Keys treated as learning outcome / objective lists
const OUTCOME_KEYS = new Set([
  'learning_outcomes', 'learning_objectives', 'objectives', 'outcomes',
  'goals', 'key_points', 'key_takeaways',
])

// Keys treated as description / summary text
const DESC_KEYS = new Set([
  'description', 'summary', 'overview', 'content', 'text',
  'body', 'note', 'notes', 'detail', 'details',
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(v: JsonValue | undefined): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function isStringArray(v: JsonValue): v is string[] {
  return Array.isArray(v) && v.every((i) => typeof i === 'string')
}

function isObjectArray(v: JsonValue): v is JsonObject[] {
  return Array.isArray(v) && v.every((i) => typeof i === 'object' && i !== null && !Array.isArray(i))
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function humanKey(key: string): string {
  return capitalise(key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
}

function slugToFilename(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .slice(0, 120)
}

// ─── Primitive paragraph builders ─────────────────────────────────────────────

function p(
  text: string,
  runOpts: { size?: number; color?: string; bold?: boolean; italics?: boolean } = {},
  paraOpts: { spacing?: { before?: number; after?: number } } = {},
): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, ...runOpts })],
    ...paraOpts,
  })
}

function hr(): Paragraph {
  return new Paragraph({
    border: {
      bottom: { color: COLOR_RULE, space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    spacing: { before: convertInchesToTwip(0.08), after: convertInchesToTwip(0.18) },
  })
}

function metaLine(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}:  `, bold: true, color: COLOR_GRAY, font: FONT, size: 20 }),
      new TextRun({ text: value, color: COLOR_GRAY, font: FONT, size: 20 }),
    ],
    spacing: { before: 50, after: 50 },
  })
}

function bulletItem(text: string, level = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.trim(), font: FONT, size: 22, color: COLOR_DARK })],
    bullet: { level },
    spacing: { before: 50, after: 50 },
  })
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] })
}

// ─── Section content helpers ──────────────────────────────────────────────────

function getTitle(obj: JsonObject): string {
  for (const key of ['title', 'name', 'section_title', 'topic_title', 'heading']) {
    const v = obj[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function getDesc(obj: JsonObject): string {
  for (const key of Array.from(DESC_KEYS)) {
    const v = obj[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

// Returns [key, items] for the first object-array child (nested sections/topics)
function findChildObjectArray(obj: JsonObject): [string, JsonObject[]] | null {
  for (const key of Array.from(CHILD_OBJECT_ARRAY_KEYS)) {
    const v = obj[key]
    if (v !== undefined && isObjectArray(v as JsonValue)) return [key, v as JsonObject[]]
  }
  return null
}

// Returns [key, items] for the first string-array child (subtopics as plain strings)
function findSubtopicStrings(obj: JsonObject): [string, string[]] | null {
  for (const key of Array.from(CHILD_ARRAY_KEYS)) {
    const v = obj[key]
    if (v !== undefined && isStringArray(v as JsonValue) && (v as string[]).length > 0) {
      return [key, v as string[]]
    }
  }
  return null
}

function sectionStats(obj: JsonObject): Paragraph | null {
  const parts: string[] = []
  const creditHours = obj.credit_hours ?? obj.credit_hour
  const minutes = obj.minutes ?? obj.duration_minutes
  const wordCount = obj.word_count ?? obj.words

  if (creditHours !== undefined && creditHours !== null) {
    parts.push(`${Number(creditHours).toFixed(2)} credit hrs`)
  }
  if (minutes !== undefined && minutes !== null) {
    parts.push(`${Number(minutes).toFixed(0)} min`)
  }
  if (wordCount !== undefined && wordCount !== null) {
    parts.push(`${Number(wordCount).toLocaleString()} words`)
  }
  if (parts.length === 0) return null

  return new Paragraph({
    children: [
      new TextRun({ text: parts.join('   •   '), color: COLOR_MUTED, font: FONT, size: 18, italics: true }),
    ],
    spacing: { before: 40, after: 100 },
  })
}

function renderStringList(items: string[], label?: string): Paragraph[] {
  const out: Paragraph[] = []
  if (label) {
    out.push(
      new Paragraph({
        children: [new TextRun({ text: label, bold: true, color: COLOR_DARK, font: FONT, size: 20 })],
        spacing: { before: 120, after: 60 },
      }),
    )
  }
  for (const item of items) {
    if (item.trim()) out.push(bulletItem(item.trim()))
  }
  return out
}

// ─── Recursive outline rendering ──────────────────────────────────────────────

function renderTopic(topic: JsonObject, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph[] {
  const out: Paragraph[] = []
  const title = getTitle(topic)

  if (title) {
    out.push(
      new Paragraph({
        heading: level,
        children: [new TextRun({ text: title, font: FONT })],
        spacing: { before: convertInchesToTwip(0.15) },
      }),
    )
  }

  const stats = sectionStats(topic)
  if (stats) out.push(stats)

  const desc = getDesc(topic)
  if (desc) {
    out.push(p(desc, { size: 20, color: COLOR_DARK }, { spacing: { before: 80, after: 80 } }))
  }

  // String subtopics (e.g. subtopics: ["...", "..."])
  const stringChild = findSubtopicStrings(topic)
  if (stringChild) {
    const [key, items] = stringChild
    out.push(...renderStringList(items, humanKey(key)))
  }

  // Learning outcomes / objectives at topic level
  for (const key of Array.from(OUTCOME_KEYS)) {
    const v = topic[key]
    if (isStringArray(v as JsonValue) && (v as string[]).length > 0) {
      out.push(...renderStringList(v as string[], humanKey(key)))
    }
  }

  // Nested object subtopics
  const objectChild = findChildObjectArray(topic)
  if (objectChild) {
    const [, children] = objectChild
    for (const child of children) {
      out.push(...renderTopic(child, HeadingLevel.HEADING_4))
    }
  }

  return out
}

function renderSection(section: JsonObject, index: number): Paragraph[] {
  const out: Paragraph[] = []
  const title = getTitle(section)

  out.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: `${index}. ${title || `Section ${index}`}`, font: FONT })],
      spacing: { before: index > 1 ? convertInchesToTwip(0.3) : 0 },
    }),
  )

  const stats = sectionStats(section)
  if (stats) out.push(stats)

  const desc = getDesc(section)
  if (desc) {
    out.push(p(desc, { size: 20, color: COLOR_DARK }, { spacing: { before: 80, after: 120 } }))
  }

  // String subtopics directly on the section (e.g. subtopics: ["...", "..."])
  const stringChild = findSubtopicStrings(section)
  if (stringChild) {
    const [key, items] = stringChild
    out.push(...renderStringList(items, humanKey(key)))
  }

  // Learning outcomes at section level
  for (const key of Array.from(OUTCOME_KEYS)) {
    const v = section[key]
    if (isStringArray(v as JsonValue) && (v as string[]).length > 0) {
      out.push(...renderStringList(v as string[], humanKey(key)))
    }
  }

  // Nested object topics
  const objectChild = findChildObjectArray(section)
  if (objectChild) {
    const [, topics] = objectChild
    for (const topic of topics) {
      out.push(...renderTopic(topic, HeadingLevel.HEADING_3))
    }
  }

  return out
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportTrainingOutlineToDocx(
  toData: JsonObject,
  options: TOExportOptions,
): Promise<void> {
  const {
    courseTitle,
    ruleFamily,
    audience,
    difficultyLevel,
    durationHours,
    description,
    objectives,
  } = options

  const titleText = courseTitle || str(toData.course_title as JsonValue) || str(toData.course_name as JsonValue) || 'Untitled Course'
  const ruleFamilyRaw = ruleFamily || str(toData.rule_family as JsonValue) || ''
  const ruleFamilyLabel = ruleFamilyRaw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Totals from nested or flat layout
  const totals = toData.totals as JsonObject | undefined
  const totalCreditHours = totals?.credit_hours ?? toData.total_credit_hours
  const totalMinutes = totals?.minutes ?? toData.total_minutes
  const totalWordCount = totals?.word_count ?? toData.total_word_count

  // Human-readable duration
  let durationText = ''
  if (durationHours !== null && durationHours !== undefined) {
    durationText = `${durationHours} hours`
  } else if (totalCreditHours) {
    durationText = `${Number(totalCreditHours).toFixed(1)} credit hours`
  } else if (totalMinutes) {
    const h = Math.floor(Number(totalMinutes) / 60)
    const m = Math.round(Number(totalMinutes) % 60)
    durationText = h > 0 ? `${h} hr ${m} min` : `${m} min`
  }

  // Fall back to TO-level description and learning_objectives when not in options
  const resolvedDescription =
    description?.trim() ||
    str(toData.description as JsonValue) ||
    str(toData.summary as JsonValue)

  const toObjectives = toData.learning_objectives
  const resolvedObjectives: string[] =
    objectives && objectives.length > 0
      ? objectives
      : isStringArray(toObjectives as JsonValue)
        ? (toObjectives as string[])
        : []

  const sections = (toData.sections as JsonObject[] | undefined) ?? []

  // ── Document children ──────────────────────────────────────────────────────
  const children: Paragraph[] = []

  // ── Title block ──────────────────────────────────────────────────────────
  children.push(
    // Spacer above title
    new Paragraph({ spacing: { before: convertInchesToTwip(0.8) } }),

    // "TRAINING OUTLINE" eyebrow label
    new Paragraph({
      children: [
        new TextRun({
          text: 'TRAINING OUTLINE',
          bold: true,
          color: COLOR_BLUE,
          font: FONT,
          size: 22,
          characterSpacing: 150,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: convertInchesToTwip(0.25) },
    }),

    // Course title
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: titleText, font: FONT, bold: true, color: COLOR_NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: convertInchesToTwip(0.15) },
    }),
  )

  // Course type label under title
  if (ruleFamilyLabel) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: ruleFamilyLabel, color: COLOR_GRAY, font: FONT, size: 22, italics: true }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: convertInchesToTwip(0.35) },
      }),
    )
  }

  children.push(hr())

  // Generated date
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Generated:  ${today}`, color: COLOR_MUTED, font: FONT, size: 18 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: convertInchesToTwip(0.15), after: convertInchesToTwip(0.6) },
    }),
  )

  // ── Course Overview ────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Course Overview', font: FONT })],
      spacing: { before: convertInchesToTwip(0.3), after: convertInchesToTwip(0.1) },
    }),
  )

  if (audience) children.push(metaLine('Target Audience', audience))
  if (durationText) children.push(metaLine('Duration', durationText))
  if (difficultyLevel) children.push(metaLine('Difficulty Level', capitalise(difficultyLevel)))
  if (ruleFamilyLabel) children.push(metaLine('Course Type', ruleFamilyLabel))
  if (totalWordCount) {
    children.push(metaLine('Estimated Word Count', Number(totalWordCount).toLocaleString()))
  }
  if (sections.length > 0) {
    children.push(metaLine('Total Sections', String(sections.length)))
  }

  // ── Course Description ─────────────────────────────────────────────────────
  if (resolvedDescription) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Course Description', font: FONT })],
        spacing: { before: convertInchesToTwip(0.3) },
      }),
      p(resolvedDescription, { size: 22, color: COLOR_DARK }, { spacing: { before: 80, after: 80 } }),
    )
  }

  // ── Learning Objectives ────────────────────────────────────────────────────
  if (resolvedObjectives.filter((o) => o.trim()).length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Learning Objectives', font: FONT })],
        spacing: { before: convertInchesToTwip(0.3) },
      }),
    )
    for (const obj of resolvedObjectives) {
      if (obj.trim()) children.push(bulletItem(obj.trim()))
    }
  }

  // ── Training Outline ───────────────────────────────────────────────────────
  children.push(
    pageBreak(),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Training Outline', font: FONT })],
      spacing: { after: convertInchesToTwip(0.15) },
    }),
  )

  if (sections.length === 0) {
    children.push(
      p('No sections defined.', { color: COLOR_MUTED, size: 20, italics: true }, {}),
    )
  } else {
    for (let i = 0; i < sections.length; i++) {
      children.push(...renderSection(sections[i], i + 1))
    }
  }

  // ── Course Summary ─────────────────────────────────────────────────────────
  const hasTotals = totalCreditHours || totalMinutes || totalWordCount
  if (hasTotals) {
    children.push(
      pageBreak(),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: 'Course Summary', font: FONT })],
        spacing: { after: convertInchesToTwip(0.1) },
      }),
    )

    if (totalWordCount) {
      children.push(metaLine('Total Word Count', Number(totalWordCount).toLocaleString()))
    }
    if (totalCreditHours) {
      children.push(metaLine('Total Credit Hours', Number(totalCreditHours).toFixed(3)))
    }
    if (totalMinutes) {
      const h = Math.floor(Number(totalMinutes) / 60)
      const m = Math.round(Number(totalMinutes) % 60)
      const display = h > 0
        ? `${h} hr ${m} min (${Number(totalMinutes).toFixed(0)} min total)`
        : `${Number(totalMinutes).toFixed(0)} min`
      children.push(metaLine('Total Duration', display))
    }
    if (sections.length > 0) {
      children.push(metaLine('Total Sections', String(sections.length)))
    }
  }

  // ── Assemble & download ────────────────────────────────────────────────────
  const doc = new Document({
    creator: 'Lectora Course Generation Engine',
    title: `${titleText} — Training Outline`,
    description: `Training Outline for ${titleText}`,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22 },
        },
        heading1: {
          run: { font: FONT, bold: true, color: COLOR_NAVY, size: 28 },
          paragraph: { spacing: { before: convertInchesToTwip(0.25), after: convertInchesToTwip(0.05) } },
        },
        heading2: {
          run: { font: FONT, bold: true, color: COLOR_BLUE, size: 24 },
          paragraph: { spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.04) } },
        },
        heading3: {
          run: { font: FONT, bold: true, color: '1e40af', size: 22 },
          paragraph: { spacing: { before: convertInchesToTwip(0.15), after: convertInchesToTwip(0.03) } },
        },
        heading4: {
          run: { font: FONT, bold: true, color: '3b82f6', size: 21 },
          paragraph: { spacing: { before: convertInchesToTwip(0.1), after: convertInchesToTwip(0.02) } },
        },
        title: {
          run: { font: FONT, bold: true, color: COLOR_NAVY, size: 48 },
          paragraph: { alignment: AlignmentType.CENTER },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1.25),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
            },
          },
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `${slugToFilename(titleText) || 'Training_Outline'}_Training_Outline.docx`

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
