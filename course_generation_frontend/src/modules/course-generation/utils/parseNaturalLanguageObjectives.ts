/**
 * Splits pasted or typed learning-objective text into individual objectives.
 * Supports numbered lists, bullets, one-per-line, semicolons, and sentence boundaries.
 */
export function parseNaturalLanguageObjectives(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const normalized = trimmed.replace(/\r\n/g, '\n')

  const numbered = normalized
    .split(/(?:^|\n)\s*\d+[.)]\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (numbered.length > 1) return numbered

  const bulleted = normalized
    .split(/(?:^|\n)\s*[-•*]\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (bulleted.length > 1) return bulleted

  const lines = normalized
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (lines.length > 1) return lines

  const bySemi = trimmed
    .split(/;\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (bySemi.length > 1) return bySemi

  const bySentence = trimmed
    .split(/(?<=[a-z])\.\s+(?=[A-Z])/)
    .map((s) => s.replace(/\.$/, '').trim())
    .filter((s) => s.length > 10)
  if (bySentence.length > 1) return bySentence

  return [trimmed]
}

export function pastedTextLooksLikeMultipleObjectives(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  const normalized = trimmed.replace(/\r\n/g, '\n')

  return (
    normalized.includes('\n') ||
    /(?:^|\n)\s*\d+[.)]\s+/.test(normalized) ||
    /(?:^|\n)\s*[-•*]\s+/.test(normalized) ||
    /;\s*\S/.test(normalized)
  )
}
