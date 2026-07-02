const LEADING_NUMBER_PREFIX_RE = /^(?:\d+[.)]?\s*)+/

/** Remove repeated leading list markers such as "1. " or "1) ". */
export function stripLeadingNumberPrefix(text: string): string {
  return text.replace(LEADING_NUMBER_PREFIX_RE, '').trim()
}

/**
 * Insert line breaks before inline numbered items extracted from DOCX/PDF.
 * Handles both "2. Explain" and "2 Explain" patterns.
 */
export function normalizeNumberedObjectiveText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/(?<=\S)\s+(?=\d+[.)]?\s+[A-Za-z])/g, '\n')
}

function splitNumberedLines(text: string): string[] {
  const normalized = normalizeNumberedObjectiveText(text)
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) {
    const matches = [...normalized.matchAll(/(?:^|\s)(\d+)[.)]?\s+([A-Za-z][\s\S]*?)(?=(?:\s\d+[.)]?\s+[A-Za-z])|$)/g)]
    if (matches.length > 1) {
      return matches.map((match) => match[2].trim()).filter(Boolean)
    }
  }

  const numberedLines = lines.filter((line) => /^\d+[.)]?\s+/.test(line))
  if (numberedLines.length > 1) {
    return numberedLines.map((line) => stripLeadingNumberPrefix(line)).filter(Boolean)
  }

  return []
}

export function parseNaturalLanguageObjectives(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const numbered = splitNumberedLines(trimmed)
  if (numbered.length > 1) return numbered

  // Try numbered list with punctuation only: "1. ...", "1) ..."
  const punctuated = trimmed
    .split(/\n?\s*\d+[.)]\s+/)
    .map((part) => stripLeadingNumberPrefix(part))
    .filter(Boolean)
  if (punctuated.length > 1) return punctuated

  // Try bullet list: "- ...", "• ...", "* ..."
  const bulleted = trimmed
    .replace(/^\s*[-•*]\s+/, '')
    .split(/\n\s*[-•*]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (bulleted.length > 1) return bulleted

  // Try semicolons
  const bySemi = trimmed
    .split(/;\s*/)
    .map((part) => stripLeadingNumberPrefix(part))
    .filter(Boolean)
  if (bySemi.length > 1) return bySemi

  // Fall back: split on ". " at sentence boundaries
  const bySentence = trimmed
    .split(/(?<=[a-z])\.\s+(?=[A-Z])/)
    .map((part) => stripLeadingNumberPrefix(part.replace(/\.$/, '')))
    .filter((part) => part.length > 10)
  if (bySentence.length > 1) return bySentence

  const single = stripLeadingNumberPrefix(trimmed)
  return single ? [single] : []
}

export function formatObjectivesForTextarea(objectives: string[]): string {
  return objectives
    .map((objective, index) => `${index + 1}. ${stripLeadingNumberPrefix(objective)}`)
    .join('\n')
}
