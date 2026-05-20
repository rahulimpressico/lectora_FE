/**
 * Client-side DOCX export for the generated course content.
 *
 * Produces a properly structured Word document with heading hierarchy,
 * learning objectives, body paragraphs, and knowledge-check callouts.
 *
 * Usage:
 *   import { exportCourseToDocx } from '../services/docxExporter'
 *   await exportCourseToDocx(courseContent)
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
  TableRow,
  TableCell,
  Table,
  WidthType,
} from 'docx'
import type { CourseContent, CourseSection } from '../types/editor'

// ─── Style constants ──────────────────────────────────────────────────────────
const BRAND_HEX = '4F46E5' // brand-600
const BRAND_LIGHT_HEX = 'EEF2FF' // brand-50
const ACCENT_HEX = '059669' // emerald-600
const MUTED_HEX = '64748B' // slate-500

// ─── Paragraph builders ───────────────────────────────────────────────────────
function heading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND_HEX, space: 4 },
    },
  })
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 100 },
  })
}

function heading3(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
  })
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { before: 80, after: 80, line: 300 },
    alignment: AlignmentType.JUSTIFIED,
  })
}

function objectiveItem(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: '• ', bold: true, color: BRAND_HEX, size: 22 }),
      new TextRun({ text, size: 22, color: '1E293B' }),
    ],
    spacing: { before: 40, after: 40 },
    indent: { left: 360 },
  })
}

function objectivesHeader(label: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true, size: 20, color: BRAND_HEX, allCaps: true }),
    ],
    spacing: { before: 160, after: 80 },
    shading: { type: ShadingType.SOLID, color: BRAND_LIGHT_HEX, fill: BRAND_LIGHT_HEX },
    indent: { left: 240, right: 240 },
  })
}

function kcCallout(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: '◆ Knowledge Check', bold: true, size: 20, color: ACCENT_HEX }),
      new TextRun({ text: ' — practice questions follow this section', size: 20, color: MUTED_HEX }),
    ],
    spacing: { before: 160, after: 160 },
    shading: { type: ShadingType.SOLID, color: 'ECFDF5', fill: 'ECFDF5' },
    indent: { left: 240, right: 240 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT_HEX },
    },
  })
}

function pageBreak(): Paragraph {
  return new Paragraph({ pageBreakBefore: true })
}

function spacer(): Paragraph {
  return new Paragraph({ text: '', spacing: { before: 40, after: 40 } })
}

// ─── Meta summary table ───────────────────────────────────────────────────────
function metaTable(content: CourseContent): Table {
  function cell(text: string, isHeader = false): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: isHeader,
              size: 18,
              color: isHeader ? MUTED_HEX : '1E293B',
            }),
          ],
          spacing: { before: 60, after: 60 },
        }),
      ],
      shading: isHeader
        ? { type: ShadingType.SOLID, color: 'F8FAFC', fill: 'F8FAFC' }
        : {},
    })
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell('Course Type', true),
          cell('Total Words', true),
          cell('Sections', true),
          cell('Read Time', true),
        ],
      }),
      new TableRow({
        children: [
          cell(content.courseType),
          cell(content.meta.totalWordCount.toLocaleString()),
          cell(`${content.meta.sectionCount} sections, ${content.meta.chapterCount} chapters`),
          cell(content.meta.estimatedReadTime),
        ],
      }),
    ],
  })
}

// ─── Section → paragraphs ─────────────────────────────────────────────────────
function sectionToChildren(
  section: CourseSection,
  depth: number,
): Paragraph[] {
  const children: Paragraph[] = []

  // Heading
  if (depth === 0) children.push(heading1(section.title))
  else if (depth === 1) children.push(heading2(section.title))
  else children.push(heading3(section.title))

  // Learning objectives block
  if (section.learningObjectives.length > 0) {
    children.push(objectivesHeader('Learning Objectives'))
    section.learningObjectives.forEach((obj) => children.push(objectiveItem(obj)))
    children.push(spacer())
  }

  // Body paragraphs
  section.content.split('\n').forEach((para) => {
    if (para.trim()) children.push(bodyParagraph(para.trim()))
  })

  // Knowledge check callout
  if (section.hasKnowledgeCheck) {
    children.push(spacer())
    children.push(kcCallout())
  }

  children.push(spacer())

  // Recurse into children
  section.children.forEach((child) => {
    children.push(...sectionToChildren(child, depth + 1))
  })

  return children
}

// ─── Main export function ─────────────────────────────────────────────────────
export async function exportCourseToDocx(content: CourseContent): Promise<void> {
  const allChildren: (Paragraph | Table)[] = []

  // ── Cover page ──────────────────────────────────────────────────────────────
  allChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: content.courseTitle,
          bold: true,
          size: 52,
          color: '1E293B',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated on ${new Date(content.generatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          size: 22,
          color: MUTED_HEX,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    metaTable(content),
    pageBreak(),
  )

  // ── Sections ────────────────────────────────────────────────────────────────
  content.sections.forEach((section, i) => {
    if (i > 0) allChildren.push(pageBreak())
    allChildren.push(...sectionToChildren(section, 0))
  })

  const doc = new Document({
    creator: 'AI Course Generation System',
    title: content.courseTitle,
    description: `Generated course: ${content.courseTitle}`,
    sections: [{ children: allChildren }],
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          quickFormat: true,
          run: { bold: true, size: 32, color: '1E293B' },
          paragraph: { spacing: { before: 360, after: 120 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          quickFormat: true,
          run: { bold: true, size: 26, color: '334155' },
          paragraph: { spacing: { before: 240, after: 100 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          quickFormat: true,
          run: { bold: true, size: 22, color: '475569' },
          paragraph: { spacing: { before: 200, after: 80 } },
        },
      ],
    },
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${content.courseTitle.replace(/\s+/g, '_')}.docx`
  anchor.click()
  URL.revokeObjectURL(url)
}
