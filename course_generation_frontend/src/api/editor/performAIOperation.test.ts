import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIOperationType, BodyParagraph } from '@/modules/course-generation/types/editor'
import { ensureParagraphIds } from '@/modules/course-generation/utils/aiContentStructure'

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  default: {
    post,
  },
}))

import { performAIOperation } from './api'

const MARKDOWN_CONTENT = '## Intro\n\nKeep **bold** and `code` unchanged.'

const STRUCTURED_PARAGRAPHS: BodyParagraph[] = [
  { type: 'text', content: 'Intro with **bold** and a [link](https://example.com).' },
  { type: 'heading_3', content: 'Details' },
  { type: 'bullet_list', items: ['One', 'Two'] },
  { type: 'numbered_list', items: ['First', 'Second'] },
  {
    type: 'important_callout',
    label: 'Important',
    content: 'Do not skip this.',
  },
  {
    type: 'callout',
    label: 'Warning',
    content: 'Watch for exceptions.',
  },
  {
    type: 'callout',
    label: 'Best Practice',
    content: 'Document everything.',
  },
  {
    type: 'table',
    headers: ['Col A', 'Col B'],
    rows: [['1', '2']],
  },
]

function mockAiResponse(overrides: {
  sectionId?: string
  operation?: AIOperationType
  content?: string
  paragraphs?: BodyParagraph[]
} = {}) {
  post.mockResolvedValue({
    data: {
      sectionId: overrides.sectionId ?? 'sec-1',
      operation: overrides.operation ?? 'summarize',
      content: overrides.content ?? 'transformed',
      paragraphs: overrides.paragraphs,
    },
  })
}

describe('performAIOperation', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('POSTs to /ai/content-transformations (not a job-scoped /ai path)', async () => {
    mockAiResponse()

    await performAIOperation({
      sectionId: 'sec-1',
      operation: 'summarize',
      content: 'Original text',
    })

    expect(post).toHaveBeenCalledTimes(1)
    const [path] = post.mock.calls[0] as [string, unknown, unknown]
    expect(path).toBe('/ai/content-transformations')
    expect(path).not.toMatch(/\/jobs\//)
    expect(path).not.toMatch(/\/ai$/)
  })

  it('does not include jobId in the path or request body', async () => {
    mockAiResponse()

    await performAIOperation({
      sectionId: '4-introduction',
      operation: 'expand',
      content: 'Short section',
    })

    const [path, body] = post.mock.calls[0] as [string, Record<string, unknown>, unknown]
    expect(path).not.toContain('job')
    expect(body).not.toHaveProperty('jobId')
    expect(JSON.stringify(body)).not.toMatch(/jobId|"job"/)
  })

  it.each([
    ['summarize', 'Condense me'],
    ['expand', 'Add depth'],
    ['simplify', 'Make plain'],
  ] as const)('supports direct toolbar operation %s', async (operation, content) => {
    mockAiResponse({ operation, content: `out-${operation}` })

    const result = await performAIOperation({
      sectionId: 'sec-leaf',
      operation,
      content,
    })

    expect(post).toHaveBeenCalledWith(
      '/ai/content-transformations',
      { sectionId: 'sec-leaf', operation, content },
      expect.objectContaining({ timeout: expect.any(Number) }),
    )
    expect(result.content).toBe(`out-${operation}`)
  })

  it.each([
    ['rewrite', 'Make paragraph 2 shorter'],
    ['improve_tone', 'More conversational intro'],
  ] as const)('supports modal operation %s with userPrompt', async (operation, userPrompt) => {
    mockAiResponse({ operation, content: `modal-${operation}` })

    const result = await performAIOperation({
      sectionId: 'sec-modal',
      operation,
      content: 'Body to edit',
      userPrompt,
    })

    expect(post).toHaveBeenCalledWith(
      '/ai/content-transformations',
      {
        sectionId: 'sec-modal',
        operation,
        content: 'Body to edit',
        userPrompt,
      },
      expect.any(Object),
    )
    expect(result.content).toBe(`modal-${operation}`)
  })

  it('omits userPrompt from the body when not provided', async () => {
    mockAiResponse({ operation: 'summarize' })

    await performAIOperation({
      sectionId: 'sec-1',
      operation: 'summarize',
      content: 'Text',
    })

    const body = post.mock.calls[0]?.[1] as Record<string, unknown>
    expect(body).not.toHaveProperty('userPrompt')
  })

  it('supports parent-section batch style: one call per child with shared userPrompt', async () => {
    const children = [
      { id: 'child-a', content: 'Child A body' },
      { id: 'child-b', content: 'Child B body' },
    ]
    const sharedPrompt = 'Keep technical terms'

    for (const child of children) {
      mockAiResponse({
        sectionId: child.id,
        operation: 'improve_tone',
        content: `toned:${child.id}`,
      })
      const result = await performAIOperation({
        sectionId: child.id,
        operation: 'improve_tone',
        content: child.content,
        userPrompt: sharedPrompt,
      })
      expect(result.sectionId).toBe(child.id)
      expect(result.content).toBe(`toned:${child.id}`)
    }

    expect(post).toHaveBeenCalledTimes(2)
    for (let i = 0; i < children.length; i++) {
      const [path, body] = post.mock.calls[i] as [string, Record<string, unknown>]
      expect(path).toBe('/ai/content-transformations')
      expect(body).toEqual({
        sectionId: children[i].id,
        operation: 'improve_tone',
        content: children[i].content,
        userPrompt: sharedPrompt,
      })
      expect(body).not.toHaveProperty('jobId')
    }
  })

  it('returns transformed Markdown/HTML content unchanged for the editor', async () => {
    const transformed = `${MARKDOWN_CONTENT}\n\n<div data-kc>quiz</div>`
    mockAiResponse({
      sectionId: 'sec-md',
      operation: 'rewrite',
      content: transformed,
    })

    const result = await performAIOperation({
      sectionId: 'sec-md',
      operation: 'rewrite',
      content: MARKDOWN_CONTENT,
      userPrompt: 'Add a knowledge check',
    })

    expect(result.content).toBe(transformed)
    expect(result.content).toContain('**bold**')
    expect(result.content).toContain('<div data-kc>quiz</div>')
  })

  it('sends structured paragraphs with preserveStructure and returns them for apply', async () => {
    const paragraphs = ensureParagraphIds(STRUCTURED_PARAGRAPHS, 'sec-rich')
    mockAiResponse({
      sectionId: 'sec-rich',
      operation: 'summarize',
      content: 'mirror',
      paragraphs,
    })

    const result = await performAIOperation({
      sectionId: 'sec-rich',
      operation: 'summarize',
      content: 'Waiting periods…',
      paragraphs,
      preserveStructure: true,
    })

    const body = post.mock.calls[0]?.[1] as Record<string, unknown>
    expect(body.paragraphs).toEqual(paragraphs)
    expect(body.preserveStructure).toBe(true)
    expect(body).not.toHaveProperty('jobId')
    expect(result.paragraphs).toEqual(paragraphs)
    expect(result.paragraphs!.some((p) => p.type === 'important_callout')).toBe(true)
    expect(result.paragraphs!.some((p) => p.type === 'table')).toBe(true)
    expect(result.paragraphs!.some((p) => p.label === 'Warning')).toBe(true)
    expect(result.paragraphs!.some((p) => p.label === 'Best Practice')).toBe(true)
  })

  it('stamps missing paragraph ids before POST so backend validation passes', async () => {
    mockAiResponse({
      sectionId: '4-introduction',
      operation: 'summarize',
      content: 'ok',
    })

    await performAIOperation({
      sectionId: '4-introduction',
      operation: 'summarize',
      content: 'Original',
      // Course load often returns blocks with no id — must not be forwarded as-is.
      paragraphs: [
        { type: 'text', content: 'Hello' },
        { type: 'important_callout', label: 'Important', content: 'Note' },
      ],
      preserveStructure: true,
    })

    const body = post.mock.calls[0]?.[1] as {
      paragraphs: Array<{ id?: string; type: string }>
    }
    expect(body.paragraphs).toHaveLength(2)
    expect(body.paragraphs[0].id).toBe('4-introduction-block-0-text')
    expect(body.paragraphs[1].id).toBe('4-introduction-block-1-important_callout')
    expect(body.paragraphs.every((p) => typeof p.id === 'string' && p.id.length > 0)).toBe(true)
  })
})
