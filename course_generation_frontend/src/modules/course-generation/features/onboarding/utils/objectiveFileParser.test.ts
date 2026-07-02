import { beforeEach, describe, expect, it, vi } from 'vitest'

const { extractRawTextMock, getDocumentMock } = vi.hoisted(() => ({
  extractRawTextMock: vi.fn(),
  getDocumentMock: vi.fn(),
}))

vi.mock('mammoth', () => ({
  default: {
    extractRawText: extractRawTextMock,
  },
}))

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: getDocumentMock,
}))

import {
  MAX_OBJECTIVES_FILE_SIZE_BYTES,
  extractObjectivesTextFromFile,
  validateObjectivesFile,
} from './objectiveFileParser'

describe('objectiveFileParser', () => {
  beforeEach(() => {
    extractRawTextMock.mockReset()
    getDocumentMock.mockReset()
  })

  it('parses a valid txt upload', async () => {
    const file = new File(
      ['1. Explain benefit triggers\n2. Compare policy types'],
      'objectives.txt',
      { type: 'text/plain' },
    )

    await expect(extractObjectivesTextFromFile(file)).resolves.toContain('Explain benefit triggers')
  })

  it('parses a valid docx upload', async () => {
    extractRawTextMock.mockResolvedValue({
      value: 'Explain employer obligations\nCompare plan designs',
    })
    const file = new File([new Uint8Array([1, 2, 3])], 'objectives.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    await expect(extractObjectivesTextFromFile(file)).resolves.toContain('Compare plan designs')
    expect(extractRawTextMock).toHaveBeenCalledOnce()
  })

  it('accepts docx files with generic browser mime types', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'objectives.docx', {
      type: 'application/octet-stream',
    })

    expect(validateObjectivesFile(file)).toBeNull()
  })

  it('rejects unsupported file types', () => {
    const file = new File(['bad'], 'objectives.png', { type: 'image/png' })
    expect(validateObjectivesFile(file)).toBe('Unsupported file type. Upload a .docx, .pdf, or .txt file.')
  })

  it('rejects empty files after parsing', async () => {
    const file = new File(['   \n\n '], 'objectives.txt', { type: 'text/plain' })

    await expect(extractObjectivesTextFromFile(file)).rejects.toThrow(
      'The uploaded file appears to be empty or does not contain readable learning objectives.',
    )
  })

  it('rejects malformed pdf files with a user-friendly error', async () => {
    getDocumentMock.mockReturnValue({
      promise: Promise.reject(new Error('broken pdf')),
    })
    const file = new File([new Uint8Array([1, 2, 3])], 'objectives.pdf', { type: 'application/pdf' })

    await expect(extractObjectivesTextFromFile(file)).rejects.toThrow(
      "We couldn't parse that PDF file. Try another file or paste the objectives manually.",
    )
  })

  it('rejects files larger than 5 MB', () => {
    const file = new File([new Uint8Array(MAX_OBJECTIVES_FILE_SIZE_BYTES + 1)], 'objectives.txt', {
      type: 'text/plain',
    })

    expect(validateObjectivesFile(file)).toBe('File is too large. Upload a file up to 5 MB.')
  })
})
