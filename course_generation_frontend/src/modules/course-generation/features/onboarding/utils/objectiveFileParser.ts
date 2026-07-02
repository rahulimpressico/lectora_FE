import mammoth from 'mammoth'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { normalizeNumberedObjectiveText } from './parseObjectivesText'

export const MAX_OBJECTIVES_FILE_SIZE_BYTES = 5 * 1024 * 1024

const SUPPORTED_EXTENSIONS = new Set(['.docx', '.pdf', '.txt'])
const SUPPORTED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'text/plain',
  // Browsers on Linux often report generic MIME types for local files.
  'application/octet-stream',
  'application/zip',
])
const PDF_WORKER_SRC = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString()

if (pdfjs.GlobalWorkerOptions.workerSrc !== PDF_WORKER_SRC) {
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC
}

function extensionFor(file: File): string {
  const match = /\.[^.]+$/.exec(file.name.toLowerCase())
  return match?.[0] ?? ''
}

function normalizeExtractedText(text: string): string {
  return normalizeNumberedObjectiveText(
    text
      .replace(/\r\n/g, '\n')
      .split('\0').join(' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim(),
  )
}

async function parseTxtFile(file: File): Promise<string> {
  return normalizeExtractedText(await file.text())
}

async function parseDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return normalizeExtractedText(result.value)
}

async function parsePdfFile(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer())
  const document = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []

  for (let pageNum = 1; pageNum <= document.numPages; pageNum += 1) {
    const page = await document.getPage(pageNum)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    if (text.trim()) {
      pages.push(text)
    }
  }

  return normalizeExtractedText(pages.join('\n\n'))
}

export function validateObjectivesFile(file: File): string | null {
  if (file.size > MAX_OBJECTIVES_FILE_SIZE_BYTES) {
    return 'File is too large. Upload a file up to 5 MB.'
  }

  const extension = extensionFor(file)
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return 'Unsupported file type. Upload a .docx, .pdf, or .txt file.'
  }

  const mimeType = file.type.toLowerCase()
  if (mimeType !== '' && !SUPPORTED_MIME_TYPES.has(mimeType)) {
    return 'Unsupported file type. Upload a .docx, .pdf, or .txt file.'
  }

  return null
}

export async function extractObjectivesTextFromFile(file: File): Promise<string> {
  const validationError = validateObjectivesFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const extension = extensionFor(file)
  let extracted = ''

  try {
    if (extension === '.txt') {
      extracted = await parseTxtFile(file)
    } else if (extension === '.docx') {
      extracted = await parseDocxFile(file)
    } else if (extension === '.pdf') {
      extracted = await parsePdfFile(file)
    }
  } catch (error) {
    throw new Error(
      `We couldn't parse that ${extension.replace('.', '').toUpperCase()} file. Try another file or paste the objectives manually.`,
      { cause: error },
    )
  }

  if (!extracted) {
    throw new Error('The uploaded file appears to be empty or does not contain readable learning objectives.')
  }

  return extracted
}
