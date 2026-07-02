import { Document, Packer, Paragraph } from 'docx'

export interface PastedSourceDefinition {
  filename: string
  content: string
}

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const FILE_MARKER = /^===\s*FILE\s*:\s*(.+?)\s*===\s*$/i

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim()
}

function normalizeFilename(raw: string): string {
  const trimmed = raw.trim().replace(/[\\/]/g, '_')
  if (!trimmed) {
    throw new Error('Enter a file name before creating a source document.')
  }

  const base = trimmed.replace(/\.[^.]+$/, '')
  const safeBase = base.replace(/[<>:"|?*\u0000-\u001F]/g, '_').trim()
  if (!safeBase) {
    throw new Error('Enter a valid file name before creating a source document.')
  }

  return safeBase.toLowerCase().endsWith('.docx') ? safeBase : `${safeBase}.docx`
}

function uniquifyFilenames(files: PastedSourceDefinition[]): PastedSourceDefinition[] {
  const seen = new Map<string, number>()

  return files.map((file) => {
    const count = seen.get(file.filename) ?? 0
    seen.set(file.filename, count + 1)
    if (count === 0) return file

    const stem = file.filename.replace(/\.docx$/i, '')
    return {
      ...file,
      filename: `${stem}-${count + 1}.docx`,
    }
  })
}

export function parsePastedSourceDefinitions(
  filename: string,
  pastedContent: string,
): PastedSourceDefinition[] {
  const content = normalizeText(pastedContent)
  const singleFilename = filename.trim()

  if (!content) {
    throw new Error('Paste source content before creating a file.')
  }

  if (singleFilename) {
    return [
      {
        filename: normalizeFilename(singleFilename),
        content,
      },
    ]
  }

  const lines = content.split('\n')
  const parsed: PastedSourceDefinition[] = []
  let currentFilename = ''
  let buffer: string[] = []

  const flush = () => {
    if (!currentFilename) return
    const body = normalizeText(buffer.join('\n'))
    if (!body) {
      throw new Error(`The pasted block for "${currentFilename}" is empty.`)
    }
    parsed.push({
      filename: normalizeFilename(currentFilename),
      content: body,
    })
    buffer = []
  }

  for (const line of lines) {
    const marker = FILE_MARKER.exec(line.trim())
    if (marker) {
      flush()
      currentFilename = marker[1]
      continue
    }
    buffer.push(line)
  }

  flush()

  if (parsed.length === 0) {
    throw new Error(
      'For multiple files, use markers like === FILE: source-name.docx === or enter a single file name above.',
    )
  }

  return uniquifyFilenames(parsed)
}

function contentToParagraphs(content: string): Paragraph[] {
  const normalized = normalizeText(content)
  if (!normalized) {
    return [new Paragraph('')]
  }

  return normalized.split('\n').map((line) => new Paragraph(line))
}

export async function createDocxFilesFromPastedSources(
  definitions: PastedSourceDefinition[],
): Promise<File[]> {
  return Promise.all(
    definitions.map(async ({ filename, content }) => {
      const doc = new Document({
        sections: [
          {
            children: contentToParagraphs(content),
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      return new File([blob], filename, { type: DOCX_MIME })
    }),
  )
}
