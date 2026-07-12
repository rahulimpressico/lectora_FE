import { describe, expect, it } from 'vitest'
import type { BodyParagraph } from '../types/editor'
import {
  allowsStructuralChange,
  buildAIContentPayload,
  countWords,
  ensureParagraphIds,
  mergeBlockPreservingStructure,
  paragraphsToContentString,
  reconcileAIParagraphs,
  resolveAIOperationResult,
} from './aiContentStructure'

/** Fixture covering every structured element called out in the AI preserve requirements. */
const RICH_SECTION_PARAGRAPHS: BodyParagraph[] = [
  {
    type: 'text',
    content:
      'Waiting periods delay coverage after issue. Review the [policy schedule](https://example.com/schedule) carefully.',
  },
  {
    type: 'heading_3',
    content: 'Common period lengths',
  },
  {
    type: 'bullet_list',
    items: [
      '**30 days** for many medical riders',
      '90 days for some disability benefits',
    ],
  },
  {
    type: 'numbered_list',
    items: [
      'Identify the clause',
      'Explain it in plain language',
      'Document acknowledgment',
    ],
  },
  {
    type: 'important_callout',
    label: 'Important',
    content: 'Claims filed **during** the waiting period are typically denied.',
  },
  {
    type: 'callout',
    label: 'Warning',
    content: 'Do not advise clients to wait until a claim arises to read the clause.',
  },
  {
    type: 'callout',
    label: 'Best Practice',
    content: 'Confirm the waiting period in writing at delivery.',
  },
  {
    type: 'table',
    caption: 'Example waiting periods',
    headers: ['Benefit', 'Typical wait'],
    rows: [
      ['Accident', 'None'],
      ['Illness', '30 days'],
    ],
  },
]

describe('aiContentStructure', () => {
  it('assigns stable block ids without inventing a second format', () => {
    const withIds = ensureParagraphIds(RICH_SECTION_PARAGRAPHS, 'sec-wait')
    expect(withIds).toHaveLength(RICH_SECTION_PARAGRAPHS.length)
    expect(withIds.every((p) => p.id)).toBe(true)
    expect(withIds[4]).toMatchObject({
      id: 'sec-wait-block-4-important_callout',
      type: 'important_callout',
      label: 'Important',
    })
    expect(withIds[7]).toMatchObject({
      type: 'table',
      headers: ['Benefit', 'Typical wait'],
    })
  })

  it('buildAIContentPayload includes paragraphs with ids', () => {
    const payload = buildAIContentPayload('sec-1', 'flat fallback', RICH_SECTION_PARAGRAPHS)
    expect(payload.paragraphs).toBeDefined()
    expect(payload.paragraphs![4].type).toBe('important_callout')
    expect(payload.paragraphs![4].id).toContain('important_callout')
    expect(payload.content).toBe('flat fallback')
  })

  it.each([
    'summarize',
    'expand',
    'simplify',
    'improve_tone',
    'rewrite',
  ] as const)('%s preserves callout types/labels and table shape when AI returns blocks', (operation) => {
    const original = ensureParagraphIds(RICH_SECTION_PARAGRAPHS, 'sec')
    const returned = original.map((p) => {
      if (p.type === 'text') {
        return { ...p, content: 'Shortened prose about waiting periods.' }
      }
      if (p.type === 'important_callout') {
        return {
          ...p,
          // Hostile AI: try to change type/label — must be rejected
          type: 'text',
          label: 'Note',
          content: 'Softened callout text.',
        }
      }
      if (p.type === 'callout' && p.label === 'Warning') {
        return { ...p, content: 'Reworded warning body.' }
      }
      if (p.type === 'table') {
        return {
          ...p,
          headers: ['Changed', 'Headers', 'Extra'],
          rows: [['Only one cell']],
          content: 'should not flatten',
        }
      }
      return { ...p, content: p.content ? `${p.content} (tweaked)` : p.content }
    })

    const reconciled = reconcileAIParagraphs(original, returned, { operation })

    const important = reconciled.find((p) => p.type === 'important_callout')
    expect(important).toBeDefined()
    expect(important!.label).toBe('Important')
    // Type change rejected → original block kept (including original content)
    expect(important!.content).toBe(
      'Claims filed **during** the waiting period are typically denied.',
    )

    const warning = reconciled.find((p) => p.label === 'Warning')
    expect(warning?.type).toBe('callout')
    expect(warning?.content).toBe('Reworded warning body.')

    const best = reconciled.find((p) => p.label === 'Best Practice')
    expect(best?.type).toBe('callout')

    const table = reconciled.find((p) => p.type === 'table')
    expect(table?.headers).toEqual(['Benefit', 'Typical wait'])
    expect(table?.rows).toEqual([
      ['Accident', 'None'],
      ['Illness', '30 days'],
    ])

    expect(reconciled.map((p) => p.type)).toEqual(original.map((p) => p.type))
  })

  it('keeps original structure when AI returns only flat content', () => {
    const original = ensureParagraphIds(RICH_SECTION_PARAGRAPHS, 'sec')
    const resolved = resolveAIOperationResult(
      original,
      { content: 'Everything flattened into one string. Important stuff lost.' },
      { sectionId: 'sec', operation: 'summarize' },
    )

    expect(resolved.paragraphs).toHaveLength(original.length)
    expect(resolved.paragraphs!.some((p) => p.type === 'important_callout')).toBe(true)
    expect(resolved.paragraphs!.some((p) => p.type === 'table')).toBe(true)
    expect(resolved.paragraphs!.find((p) => p.label === 'Best Practice')).toBeTruthy()
    expect(resolved.content).not.toBe(
      'Everything flattened into one string. Important stuff lost.',
    )
    expect(resolved.content).toContain('Claims filed')
  })

  it('applies updated paragraphs and derives content from blocks (not stale API content)', () => {
    const original = ensureParagraphIds(RICH_SECTION_PARAGRAPHS, 'sec-wait')
    const summarizedText =
      'Waiting periods delay coverage. Review the schedule. Common lengths: 30 or 90 days.'
    const returned = original.map((p) => {
      if (p.type === 'text') {
        return { ...p, content: summarizedText }
      }
      if (p.type === 'heading_3') {
        return { ...p, content: 'Period lengths' }
      }
      if (p.type === 'bullet_list') {
        return { ...p, items: ['**30 days** medical', '90 days disability'] }
      }
      if (p.type === 'numbered_list') {
        return { ...p, items: ['Identify', 'Explain', 'Document'] }
      }
      if (p.type === 'important_callout') {
        return { ...p, content: 'Claims during the wait are typically denied.' }
      }
      if (p.type === 'callout' && p.label === 'Warning') {
        return { ...p, content: 'Do not wait for a claim to read the clause.' }
      }
      if (p.type === 'callout' && p.label === 'Best Practice') {
        return { ...p, content: 'Confirm the wait in writing.' }
      }
      return p
    })

    const staleTopLevelContent = 'THIS IS THE OLD UNCHANGED TOP-LEVEL CONTENT FROM THE MODEL'
    const resolved = resolveAIOperationResult(
      original,
      { content: staleTopLevelContent, paragraphs: returned },
      { sectionId: 'sec-wait', operation: 'summarize', preserveStructure: true },
    )

    const expectedFromBlocks = paragraphsToContentString(
      reconcileAIParagraphs(original, returned, {
        operation: 'summarize',
        sectionId: 'sec-wait',
      }),
    )

    expect(resolved.content).toBe(expectedFromBlocks)
    expect(resolved.content).not.toBe(staleTopLevelContent)
    expect(countWords(resolved.content)).toBeLessThan(countWords(paragraphsToContentString(original)))
    expect(resolved.paragraphs![0].content).toBe(summarizedText)
    expect(resolved.paragraphs!.find((p) => p.type === 'important_callout')?.label).toBe('Important')
    expect(resolved.paragraphs!.find((p) => p.label === 'Best Practice')?.content).toBe(
      'Confirm the wait in writing.',
    )
    expect(resolved.paragraphs!.find((p) => p.type === 'table')?.headers).toEqual([
      'Benefit',
      'Typical wait',
    ])
  })

  it('ignores mismatched top-level content when paragraphs are transformed (sample expand response)', () => {
    const original: BodyParagraph[] = [
      {
        id: 'section-block-0-text',
        type: 'text',
        content: 'Short intro about annuity funding.',
      },
      {
        id: 'section-block-1-text',
        type: 'text',
        content: 'Single vs flexible premium.',
      },
      {
        id: 'section-block-2-text',
        type: 'text',
        content: 'Flexible premium is practical.',
      },
      {
        id: 'section-block-3-text',
        type: 'text',
        content: 'Insurers set min/max premiums.',
      },
      {
        id: 'section-block-4-important_callout',
        type: 'important_callout',
        label: 'Common Mistake',
        content: 'Do not assume flexible is always better.',
      },
      {
        id: 'section-block-5-text',
        type: 'text',
        content: 'Match funding to cash flow.',
      },
    ]

    const transformedParagraphs: BodyParagraph[] = [
      {
        type: 'text',
        content:
          'Because the timing of income is only one part of the contract, you also need to look at **how the annuity is funded**.',
        id: 'section-block-0-text',
      },
      {
        type: 'text',
        content:
          'A **single premium annuity** is funded with one premium payment. A **flexible premium annuity** allows multiple premium payments.',
        id: 'section-block-1-text',
      },
      {
        type: 'text',
        content:
          'For many deferred annuity buyers, flexible premium funding is more practical because it lets them add money over time.',
        id: 'section-block-2-text',
      },
      {
        type: 'text',
        content:
          'Insurers often set minimum premiums to avoid processing very small deposits, and they may set maximums.',
        id: 'section-block-3-text',
      },
      {
        type: 'important_callout',
        label: 'Common Mistake',
        content:
          'Do not assume a flexible premium annuity is automatically better. It is better when the client needs funding flexibility.',
        id: 'section-block-4-important_callout',
      },
      {
        type: 'text',
        content:
          'Timing tells you when income starts, while premium structure tells you how money gets into the contract.',
        id: 'section-block-5-text',
      },
    ]

    // Stale top-level content (original unchanged prose) — must NOT win over paragraphs.
    const staleContent =
      'Because the timing of income is only one part of the contract, you also need to look at how the annuity is funded.\n\nA **single premium annuity** is funded with one premium payment.'

    const resolved = resolveAIOperationResult(
      original,
      { content: staleContent, paragraphs: transformedParagraphs },
      {
        sectionId: '4-ch-1-sec-1',
        operation: 'expand',
        preserveStructure: true,
      },
    )

    const joinedBlocks = paragraphsToContentString(resolved.paragraphs!)

    expect(resolved.content).toBe(joinedBlocks)
    expect(resolved.content).not.toBe(staleContent)
    // Explicit contract: derived content must equal joined transformed blocks.
    expect(resolved.content).not.toEqual(staleContent)
    expect(countWords(resolved.content)).toBe(countWords(joinedBlocks))
    expect(resolved.paragraphs![0].content).toContain('**how the annuity is funded**')
    expect(resolved.paragraphs!.find((p) => p.id === 'section-block-4-important_callout')).toMatchObject({
      type: 'important_callout',
      label: 'Common Mistake',
    })
    expect(resolved.paragraphs!.map((p) => p.id)).toEqual(original.map((p) => p.id))
    expect(resolved.paragraphs!.map((p) => p.type)).toEqual(original.map((p) => p.type))
  })

  it('fails the stale-content contract when top-level content differs from joined blocks', () => {
    const original = ensureParagraphIds(
      [
        { type: 'text', content: 'Original A' },
        { type: 'text', content: 'Original B' },
      ],
      'sec',
    )
    const returned = [
      { ...original[0], content: 'Transformed A with more detail' },
      { ...original[1], content: 'Transformed B with more detail' },
    ]
    const staleTopLevel = 'Original A\n\nOriginal B'

    const resolved = resolveAIOperationResult(
      original,
      { content: staleTopLevel, paragraphs: returned },
      { sectionId: 'sec', operation: 'expand', preserveStructure: true },
    )

    const joined = paragraphsToContentString(resolved.paragraphs!)
    // If someone reintroduces "prefer response.content", this assertion fails.
    expect(staleTopLevel).not.toBe(joined)
    expect(resolved.content).toBe(joined)
    expect(resolved.content).toContain('Transformed A')
    expect(resolved.content).not.toBe(staleTopLevel)
  })

  it('accepts response blocks when client request ids differ from reconcile defaults', () => {
    // Request stamped ids with real sectionId; a buggy reconcile used to re-id
    // originals as "section-block-*" and discard the API text updates.
    const original = RICH_SECTION_PARAGRAPHS.map((p, i) => ({
      ...p,
      id: `4-introduction-block-${i}-${p.type}`,
    }))
    const returned = original.map((p) =>
      p.type === 'text'
        ? { ...p, content: 'API summarized prose that must appear in the editor.' }
        : p,
    )

    const resolved = resolveAIOperationResult(
      // Intentionally pass originals WITHOUT ids (as stored on the section)
      RICH_SECTION_PARAGRAPHS,
      {
        content: 'API summarized prose that must appear in the editor.',
        paragraphs: returned,
      },
      { sectionId: '4-introduction', operation: 'summarize' },
    )

    expect(resolved.paragraphs![0].content).toBe(
      'API summarized prose that must appear in the editor.',
    )
    expect(resolved.content).toContain('API summarized prose that must appear in the editor.')
  })

  it('allows list item and bold text updates while keeping list type', () => {
    const original = ensureParagraphIds(
      [
        { type: 'bullet_list', items: ['**Old** item', 'Second'] },
        { type: 'text', content: 'See [docs](https://example.com).' },
      ],
      'sec',
    )
    const returned = [
      { ...original[0], items: ['**New** item', 'Second revised'] },
      { ...original[1], content: 'See [docs](https://example.com/v2).' },
    ]
    const reconciled = reconcileAIParagraphs(original, returned, { operation: 'simplify' })
    expect(reconciled[0].type).toBe('bullet_list')
    expect(reconciled[0].items).toEqual(['**New** item', 'Second revised'])
    expect(reconciled[1].content).toContain('https://example.com/v2')
  })

  it('mergeBlockPreservingStructure locks callout variant', () => {
    const merged = mergeBlockPreservingStructure(
      {
        id: 'c1',
        type: 'callout',
        label: 'Best Practice',
        content: 'Original tip',
      },
      {
        id: 'c1',
        type: 'callout',
        label: 'Warning',
        content: 'Rewritten tip',
      },
    )
    expect(merged.label).toBe('Best Practice')
    expect(merged.content).toBe('Rewritten tip')
  })

  it('rewrite with explicit structural prompt may reorder but restores missing protected blocks', () => {
    const original = ensureParagraphIds(RICH_SECTION_PARAGRAPHS, 'sec')
    expect(allowsStructuralChange('rewrite', 'Please remove the table and restructure')).toBe(true)

    const withoutTable = original.filter((p) => p.type !== 'table')
    const reconciled = reconcileAIParagraphs(original, withoutTable, {
      operation: 'rewrite',
      userPrompt: 'Please remove the table and restructure',
    })

    expect(reconciled.some((p) => p.type === 'table')).toBe(true)
    expect(reconciled.some((p) => p.type === 'important_callout')).toBe(true)
  })

  it('paragraphsToContentString keeps bold and link markdown in the flat mirror', () => {
    const text = paragraphsToContentString(
      ensureParagraphIds(RICH_SECTION_PARAGRAPHS, 'sec'),
    )
    expect(text).toContain('**30 days**')
    expect(text).toContain('https://example.com/schedule')
    expect(text).toContain('Benefit | Typical wait')
  })
})
