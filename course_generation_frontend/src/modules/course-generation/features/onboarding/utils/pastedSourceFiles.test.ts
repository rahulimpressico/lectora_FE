import { describe, expect, it } from 'vitest'
import {
  createDocxFilesFromPastedSources,
  parsePastedSourceDefinitions,
} from './pastedSourceFiles'

describe('parsePastedSourceDefinitions', () => {
  it('parses a single file from filename and content', () => {
    const result = parsePastedSourceDefinitions('benefits-guide', 'Line 1\nLine 2')

    expect(result).toEqual([
      {
        filename: 'benefits-guide.docx',
        content: 'Line 1\nLine 2',
      },
    ])
  })

  it('parses multiple files from paste markers', () => {
    const result = parsePastedSourceDefinitions(
      '',
      [
        '=== FILE: first-source.docx ===',
        'First content',
        '',
        '=== FILE: second-source ===',
        'Second content',
      ].join('\n'),
    )

    expect(result).toEqual([
      { filename: 'first-source.docx', content: 'First content' },
      { filename: 'second-source.docx', content: 'Second content' },
    ])
  })

  it('rejects markerless multi-file paste without a filename', () => {
    expect(() => parsePastedSourceDefinitions('', 'Only pasted text')).toThrow(
      /For multiple files|single file name above/,
    )
  })

  it('deduplicates repeated filenames', () => {
    const result = parsePastedSourceDefinitions(
      '',
      [
        '=== FILE: duplicate.docx ===',
        'One',
        '=== FILE: duplicate.docx ===',
        'Two',
      ].join('\n'),
    )

    expect(result.map((entry) => entry.filename)).toEqual([
      'duplicate.docx',
      'duplicate-2.docx',
    ])
  })
})

describe('createDocxFilesFromPastedSources', () => {
  it('creates real docx files', async () => {
    const [file] = await createDocxFilesFromPastedSources([
      { filename: 'sample.docx', content: 'Hello world' },
    ])

    expect(file.name).toBe('sample.docx')
    expect(file.type).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    expect(file.size).toBeGreaterThan(0)
  })
})
