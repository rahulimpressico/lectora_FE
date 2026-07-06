/**
 * Helpers for preserving markdown structure in AI-edited section content.
 */

/** True when text contains block-level markdown (headings, lists, tables, code fences). */
export function containsBlockMarkdown(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  return (
    /^#{1,6}\s+/m.test(trimmed) ||
    /^\s*[-*+]\s+/m.test(trimmed) ||
    /^\s*\d+\.\s+/m.test(trimmed) ||
    /^```/m.test(trimmed) ||
    /^\s*>/m.test(trimmed) ||
    /^\|.+\|/m.test(trimmed)
  )
}
