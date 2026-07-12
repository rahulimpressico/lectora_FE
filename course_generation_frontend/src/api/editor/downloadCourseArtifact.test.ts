import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CourseContent } from '@/modules/course-generation/types/editor'

const { post, get } = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  default: {
    post,
    get,
  },
}))

import {
  downloadCourseArtifact,
  filenameFromContentDisposition,
} from './api'

const snapshot: CourseContent = {
  jobId: 'job-1',
  courseTitle: 'Test Course',
  courseType: 'study-guide',
  generatedAt: '2026-07-12T00:00:00.000Z',
  meta: {
    totalWordCount: 100,
    sectionCount: 1,
    chapterCount: 1,
    estimatedReadTime: '1 min',
  },
  sections: [
    {
      id: 'sec-1',
      title: 'Chapter 1',
      level: 1,
      sectionType: 'content',
      content: 'Edited body',
      learningObjectives: [],
      wordCount: 2,
      hasKnowledgeCheck: false,
      order: 0,
      children: [],
    },
  ],
}

function makeDocxBlob(size = 256): Blob {
  return new Blob([new Uint8Array(size)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

describe('filenameFromContentDisposition', () => {
  it('parses quoted filename', () => {
    expect(
      filenameFromContentDisposition('attachment; filename="my_course.docx"'),
    ).toBe('my_course.docx')
  })

  it('parses unquoted filename', () => {
    expect(
      filenameFromContentDisposition('attachment; filename=plain.docx'),
    ).toBe('plain.docx')
  })

  it('parses RFC 5987 filename*', () => {
    expect(
      filenameFromContentDisposition(
        "attachment; filename*=UTF-8''edited%20course.docx",
      ),
    ).toBe('edited course.docx')
  })

  it('returns null when header is missing', () => {
    expect(filenameFromContentDisposition(undefined)).toBeNull()
    expect(filenameFromContentDisposition(null)).toBeNull()
  })
})

describe('downloadCourseArtifact', () => {
  let click: ReturnType<typeof vi.fn>
  let appendChild: ReturnType<typeof vi.fn>
  let removeChild: ReturnType<typeof vi.fn>
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let anchor: { href: string; download: string; click: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    post.mockReset()
    get.mockReset()
    click = vi.fn()
    appendChild = vi.fn()
    removeChild = vi.fn()
    createObjectURL = vi.fn(() => 'blob:mock-url')
    revokeObjectURL = vi.fn()
    anchor = { href: '', download: '', click }

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
      body: { appendChild, removeChild },
    })
    vi.useFakeTimers()
  })

  it('POSTs render-docx with the full snapshot as a blob response', async () => {
    post.mockResolvedValue({
      data: makeDocxBlob(),
      headers: {
        'content-disposition': 'attachment; filename="from_header.docx"',
      },
    })

    await downloadCourseArtifact('job-1', snapshot)

    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(
      '/jobs/job-1/artifacts/render-docx',
      snapshot,
      expect.objectContaining({ responseType: 'blob' }),
    )
    expect(get).not.toHaveBeenCalled()
  })

  it('does not call the old GET download endpoint', async () => {
    post.mockResolvedValue({
      data: makeDocxBlob(),
      headers: {},
    })

    await downloadCourseArtifact('job-1', snapshot)

    expect(get).not.toHaveBeenCalled()
    const urls = post.mock.calls.map((call) => String(call[0]))
    expect(urls.some((u) => u.includes('/artifacts/download'))).toBe(false)
  })

  it('uses Content-Disposition filename when present', async () => {
    post.mockResolvedValue({
      data: makeDocxBlob(),
      headers: {
        'content-disposition': 'attachment; filename="custom_name.docx"',
      },
    })

    await downloadCourseArtifact('job-1', snapshot)

    expect(anchor.download).toBe('custom_name.docx')
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalled()
  })

  it('falls back to course_${jobId}.docx when Content-Disposition is absent', async () => {
    post.mockResolvedValue({
      data: makeDocxBlob(),
      headers: {},
    })

    await downloadCourseArtifact('job-99', snapshot)

    expect(anchor.download).toBe('course_job-99.docx')
  })

  it('rejects tiny / empty blobs', async () => {
    post.mockResolvedValue({
      data: new Blob([new Uint8Array(0)]),
      headers: {},
    })

    await expect(downloadCourseArtifact('job-1', snapshot)).rejects.toThrow(
      /empty or invalid file/,
    )
    expect(click).not.toHaveBeenCalled()
  })
})
