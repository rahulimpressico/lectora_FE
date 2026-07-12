import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CourseContent } from '@/modules/course-generation/types/editor'

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  default: {
    post,
  },
}))

import { saveToAzure } from './api'

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

describe('saveToAzure', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('POSTs save-to-azure with the full course snapshot', async () => {
    post.mockResolvedValue({
      data: {
        status: 'uploaded',
        jobId: 'job-1',
        fileName: 'study_guide.docx',
        blobPath: 'course/job-1/versions/v1/output/study_guide.docx',
        containerName: 'generated-courses',
        versionNumber: 1,
        savedAt: '2026-07-12T12:00:00.000Z',
      },
    })

    const result = await saveToAzure('job-1', {
      course: snapshot,
      courseSlug: 'test-course',
    })

    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(
      '/jobs/job-1/artifacts/save-to-azure',
      { course: snapshot, courseSlug: 'test-course' },
      expect.objectContaining({ timeout: expect.any(Number) }),
    )
    expect(result.versionNumber).toBe(1)
    expect(result.blobPath).toContain('study_guide.docx')
  })

  it('omits blank courseSlug from the body', async () => {
    post.mockResolvedValue({
      data: {
        status: 'uploaded',
        jobId: 'job-1',
        fileName: 'study_guide.docx',
        blobPath: 'path',
        containerName: 'generated-courses',
      },
    })

    await saveToAzure('job-1', { course: snapshot, courseSlug: '   ' })

    expect(post).toHaveBeenCalledWith(
      '/jobs/job-1/artifacts/save-to-azure',
      { course: snapshot },
      expect.any(Object),
    )
  })

  it('does not send legacy metadata-only fields', async () => {
    post.mockResolvedValue({
      data: {
        status: 'uploaded',
        jobId: 'job-1',
        fileName: 'study_guide.docx',
        blobPath: 'path',
        containerName: 'generated-courses',
      },
    })

    await saveToAzure('job-1', { course: snapshot })

    const body = post.mock.calls[0]?.[1] as Record<string, unknown>
    expect(body).not.toHaveProperty('courseTitle')
    expect(body).not.toHaveProperty('sectionOrder')
    expect(body).toHaveProperty('course', snapshot)
  })
})
