import { describe, expect, it } from 'vitest'
import {
  mapObjectivesToChapters,
  parseObjectivesWithFeedback,
  runLoOutlineSync,
  validateLearningObjectives,
  validateOutlineStructure,
} from './loOutlineSync'
import { parseNaturalLanguageObjectives } from './parseObjectivesText'

describe('loOutlineSync', () => {
  it('validates non-empty objectives', () => {
    const result = validateLearningObjectives([
      'Explain health plan basics',
      'Apply enrollment rules to client scenarios',
      'Describe HIPAA privacy requirements',
    ])
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('flags empty objectives', () => {
    const result = validateLearningObjectives(['', 'Valid objective text here'])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Objective 1'))).toBe(true)
  })

  it('validates outline chapters with 1-based numbering warnings', () => {
    const result = validateOutlineStructure({
      sections: [
        { title: '0. Bad chapter', subtopics: ['0.1 Sub'] },
        { title: '2. Good chapter', subtopics: ['2.1 Subtopic'] },
      ],
    })
    expect(result.chapters).toHaveLength(2)
    expect(result.chapters[0].chapterNumber).toBe(1)
    expect(result.warnings.some((w) => w.includes('starts with 0'))).toBe(true)
  })

  it('maps objectives across chapters', () => {
    const chapters = mapObjectivesToChapters(
      ['LO1', 'LO2', 'LO3', 'LO4'],
      [
        { chapterNumber: 1, title: 'Ch 1', subtopics: [], missingFields: [], mappedObjectives: [] },
        { chapterNumber: 2, title: 'Ch 2', subtopics: [], missingFields: [], mappedObjectives: [] },
      ],
    )
    expect(chapters[0].mappedObjectives).toEqual([1, 3])
    expect(chapters[1].mappedObjectives).toEqual([2, 4])
  })

  it('reports outline invalidation when objectives change', () => {
    const result = runLoOutlineSync({
      objectives: ['New objective one', 'New objective two', 'New objective three'],
      previousObjectives: ['Old objective one', 'Old objective two', 'Old objective three'],
      toData: { sections: [{ title: '1. Chapter', subtopics: ['1.1 Sub'] }] },
      outlineInvalidated: true,
    })
    expect(result.outlineInvalidated).toBe(true)
    expect(result.objectivesChanged).toBe(true)
    expect(result.summary).toContain('structure invalidated')
  })

  it('parseObjectivesWithFeedback returns error for empty parse', () => {
    const result = parseObjectivesWithFeedback('just one long sentence without separators', parseNaturalLanguageObjectives)
    expect(result.objectives.length).toBeGreaterThanOrEqual(1)
  })

  it('parseObjectivesWithFeedback returns error for blank input', () => {
    const result = parseObjectivesWithFeedback('   ', parseNaturalLanguageObjectives)
    expect(result.error).toMatch(/before parsing/i)
  })
})
