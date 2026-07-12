/**
 * Structure-preserving helpers for course-editor AI transformations.
 *
 * Canonical body format is `BodyParagraph[]` (custom block JSON). Flat `content`
 * remains a parallel string for word counts / markdown fallback — AI must not
 * flatten callouts, tables, or other protected blocks into plain text.
 *
 * When the API returns `paragraphs`, those blocks are the source of truth for
 * structured sections (`preserveStructure`). Protected metadata (type, callout
 * label, table shape) is locked from the original; textual fields come from
 * the response. Flat `content` alone must never regenerate or replace blocks.
 */
import type { AIOperationType, BodyParagraph } from '../types/editor'

/** Blocks whose type / variant / shape must survive AI transforms. */
export const PROTECTED_BLOCK_TYPES = new Set([
  'important_callout',
  'callout',
  'table',
  'knowledge_check',
])

const STRUCTURAL_PROMPT_RE =
  /\b(remove|delete|drop|merge|split|reorder|restructure|convert|turn into|change (?:the )?structure|add (?:a )?(?:table|callout|list|section)|delete (?:the )?(?:table|callout))\b/i

export function isProtectedBlockType(type: string): boolean {
  return PROTECTED_BLOCK_TYPES.has(type)
}

/** True when rewrite may alter document structure (explicit user request). */
export function allowsStructuralChange(
  operation: AIOperationType,
  userPrompt?: string,
): boolean {
  if (operation !== 'rewrite') return false
  return STRUCTURAL_PROMPT_RE.test(userPrompt ?? '')
}

/** Assign stable client-side IDs when the backend omitted them. Always returns plain objects. */
export function ensureParagraphIds(
  paragraphs: BodyParagraph[],
  sectionId = 'section',
): BodyParagraph[] {
  const safeSection = String(sectionId || 'section').replace(/[^\w.-]+/g, '-') || 'section'
  return paragraphs.map((para, index) => {
    const type = (typeof para.type === 'string' && para.type.trim()) || 'text'
    const existing = typeof para.id === 'string' ? para.id.trim() : ''
    const id = existing || `${safeSection}-block-${index}-${type}`
    // Always emit a fresh plain object with a required non-empty id (backend validates this).
    return {
      ...para,
      type,
      id,
    }
  })
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Derive a flat content string from blocks (word count / string fallback). */
export function paragraphsToContentString(paragraphs: BodyParagraph[]): string {
  const parts: string[] = []
  for (const para of paragraphs) {
    switch (para.type) {
      case 'text':
      case 'heading_3':
      case 'heading_4':
      case 'important_callout':
      case 'callout':
        if (para.content?.trim()) parts.push(para.content.trim())
        break
      case 'bullet_list':
      case 'numbered_list':
      case 'sub_bullet_list':
        if (para.items?.length) {
          parts.push(
            para.items
              .map((item, i) =>
                para.type === 'numbered_list' ? `${i + 1}. ${item}` : `- ${item}`,
              )
              .join('\n'),
          )
        }
        break
      case 'table': {
        const header = para.headers?.join(' | ')
        const rows = (para.rows ?? []).map((r) => r.join(' | '))
        const tableParts = [para.caption, header, ...rows].filter(Boolean)
        if (tableParts.length) parts.push(tableParts.join('\n'))
        break
      }
      case 'knowledge_check': {
        const kc = [
          para.question,
          ...(para.options ?? []),
          para.explanation,
        ].filter(Boolean)
        if (kc.length) parts.push(kc.join('\n'))
        break
      }
      default:
        if (para.content?.trim()) parts.push(para.content.trim())
    }
  }
  return parts.join('\n\n')
}

function sameLengthStrings(
  original: string[] | undefined,
  returned: string[] | undefined,
): string[] | undefined {
  if (!original) return returned
  if (!returned || returned.length !== original.length) return original
  return returned
}

function sameShapeRows(
  original: string[][] | undefined,
  returned: string[][] | undefined,
): string[][] | undefined {
  if (!original) return returned
  if (!returned || returned.length !== original.length) return original
  return original.map((row, i) => {
    const next = returned[i]
    if (!next || next.length !== row.length) return row
    return next
  })
}

/**
 * Merge one returned block onto the original, locking protected metadata.
 * Textual fields (prose, list items, table cell text) may update.
 */
export function mergeBlockPreservingStructure(
  original: BodyParagraph,
  returned: BodyParagraph,
): BodyParagraph {
  const id = original.id ?? returned.id
  const type = original.type

  if (type === 'important_callout' || type === 'callout') {
    return {
      ...original,
      id,
      type,
      label: original.label,
      content: returned.content ?? original.content,
    }
  }

  if (type === 'table') {
    return {
      ...original,
      id,
      type,
      caption: returned.caption ?? original.caption,
      headers: sameLengthStrings(original.headers, returned.headers) ?? original.headers,
      rows: sameShapeRows(original.rows, returned.rows) ?? original.rows,
    }
  }

  if (type === 'knowledge_check') {
    return {
      ...original,
      id,
      type,
      question: returned.question ?? original.question,
      explanation: returned.explanation ?? original.explanation,
      options: sameLengthStrings(original.options, returned.options) ?? original.options,
      correct_answer: original.correct_answer,
    }
  }

  // Prose / headings / lists — keep type; allow text + items updates.
  return {
    ...original,
    id,
    type,
    content: returned.content ?? original.content,
    items: returned.items ?? original.items,
  }
}

function indexById(paragraphs: BodyParagraph[]): Map<string, BodyParagraph> {
  const map = new Map<string, BodyParagraph>()
  for (const para of paragraphs) {
    if (para.id) map.set(para.id, para)
  }
  return map
}

/**
 * Structure is compatible when every returned block matches an original by id
 * (preferred) or by index type — so summarize/expand text updates are accepted.
 */
function structuresCompatible(
  original: BodyParagraph[],
  returned: BodyParagraph[],
): boolean {
  if (returned.length !== original.length) return false
  const byId = indexById(original)
  return returned.every((ret, i) => {
    const orig = (ret.id && byId.get(ret.id)) || original[i]
    return !!orig && orig.type === ret.type
  })
}

/**
 * Reconcile AI output with the original structured body.
 *
 * When returned paragraphs are structure-compatible, they are the source of
 * truth for textual fields. Protected metadata is locked from the original.
 * When the model omits `paragraphs` or violates structure, originals are kept.
 */
export function reconcileAIParagraphs(
  original: BodyParagraph[],
  returned: BodyParagraph[] | undefined,
  options: {
    operation: AIOperationType
    userPrompt?: string
    sectionId?: string
  },
): BodyParagraph[] {
  const sectionId = options.sectionId ?? 'section'
  const originalWithIds = ensureParagraphIds(original, sectionId)
  if (originalWithIds.length === 0) {
    return returned && returned.length > 0
      ? ensureParagraphIds(returned, sectionId)
      : []
  }

  if (!returned || returned.length === 0) {
    return originalWithIds
  }

  const returnedWithIds = ensureParagraphIds(returned, sectionId)
  const allowStructural = allowsStructuralChange(options.operation, options.userPrompt)

  if (allowStructural) {
    const keptIds = new Set(returnedWithIds.map((p) => p.id).filter(Boolean) as string[])
    const missingProtected = originalWithIds.filter(
      (p) => p.id && isProtectedBlockType(p.type) && !keptIds.has(p.id),
    )
    if (missingProtected.length === 0) {
      return returnedWithIds.map((ret) => {
        const orig = ret.id
          ? originalWithIds.find((o) => o.id === ret.id)
          : undefined
        if (orig && isProtectedBlockType(orig.type) && ret.type === orig.type) {
          return mergeBlockPreservingStructure(orig, ret)
        }
        return ret
      })
    }
    const merged = [...returnedWithIds]
    for (const missing of missingProtected) {
      const origIndex = originalWithIds.findIndex((p) => p.id === missing.id)
      const insertAt = Math.min(Math.max(origIndex, 0), merged.length)
      merged.splice(insertAt, 0, missing)
    }
    return merged
  }

  // Compatible structured response → apply returned text, lock protected meta.
  if (structuresCompatible(originalWithIds, returnedWithIds)) {
    const origById = indexById(originalWithIds)
    return returnedWithIds.map((ret, i) => {
      const orig = (ret.id && origById.get(ret.id)) || originalWithIds[i]
      if (!orig) return ret
      if (isProtectedBlockType(orig.type) || orig.type === ret.type) {
        return mergeBlockPreservingStructure(orig, ret)
      }
      return ret
    })
  }

  // Incompatible shape — merge by index where types align; otherwise keep original.
  return originalWithIds.map((orig, i) => {
    const ret = returnedWithIds[i]
    if (!ret || ret.type !== orig.type) return orig
    return mergeBlockPreservingStructure(orig, ret)
  })
}

/** Build the structured payload fields for an AI request. */
export function buildAIContentPayload(
  sectionId: string,
  content: string,
  paragraphs: BodyParagraph[] | undefined,
): { content: string; paragraphs?: BodyParagraph[] } {
  if (!paragraphs || paragraphs.length === 0) {
    return { content }
  }
  const withIds = ensureParagraphIds(paragraphs, sectionId)
  return {
    content: content.trim() ? content : paragraphsToContentString(withIds),
    paragraphs: withIds,
  }
}

/**
 * Finalize an AI response into editor-ready content + paragraphs.
 *
 * When `response.paragraphs` is present (structured / preserveStructure path),
 * transformed blocks are the **only** source of truth. Top-level `content` from
 * the API is ignored because models often leave it stale while updating blocks.
 * After validation/reconcile, `content` is always derived from the blocks.
 */
export function resolveAIOperationResult(
  originalParagraphs: BodyParagraph[] | undefined,
  response: {
    content: string
    paragraphs?: BodyParagraph[]
  },
  options: {
    sectionId: string
    operation: AIOperationType
    userPrompt?: string
    preserveStructure?: boolean
  },
): { content: string; paragraphs?: BodyParagraph[] } {
  const hasReturnedBlocks =
    Array.isArray(response.paragraphs) && response.paragraphs.length > 0
  const preserveStructure = options.preserveStructure !== false

  if (!originalParagraphs || originalParagraphs.length === 0) {
    if (hasReturnedBlocks) {
      const paras = ensureParagraphIds(response.paragraphs!, options.sectionId)
      // Structured response without prior blocks — still derive content from blocks.
      return {
        content: paragraphsToContentString(paras),
        paragraphs: paras,
      }
    }
    return { content: response.content }
  }

  if (!hasReturnedBlocks) {
    // Flat-only response must not wipe structured blocks.
    const kept = ensureParagraphIds(originalParagraphs, options.sectionId)
    return {
      content: paragraphsToContentString(kept),
      paragraphs: kept,
    }
  }

  const reconciled = reconcileAIParagraphs(
    originalParagraphs,
    response.paragraphs,
    {
      operation: options.operation,
      userPrompt: options.userPrompt,
      sectionId: options.sectionId,
    },
  )

  // Always derive content from validated blocks when preserveStructure is on
  // (default for structured AI). Never trust mismatched top-level `content`.
  const derived = paragraphsToContentString(reconciled)
  if (preserveStructure) {
    return { content: derived, paragraphs: reconciled }
  }

  // Structural rewrite path: still prefer derived blocks when present.
  return {
    content: derived || response.content,
    paragraphs: reconciled,
  }
}
