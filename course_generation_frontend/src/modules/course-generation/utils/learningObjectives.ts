import type { CourseSection } from '../types/editor'

/**
 * Extract the objective strings for the dedicated `sectionType:
 * 'learning-objectives'` section. That section carries no separate
 * `learningObjectives` array — the list items live in its `paragraphs`
 * (a `bullet_list`/`numbered_list` block), with plain-text `content` as the
 * fallback for sections that only round-tripped through a save.
 */
export function getSectionLearningObjectives(section: CourseSection): string[] {
  const fromParagraphs = (section.paragraphs ?? []).flatMap((block) =>
    block.type === 'bullet_list' ||
    block.type === 'numbered_list' ||
    block.type === 'sub_bullet_list'
      ? block.items ?? []
      : [],
  )
  if (fromParagraphs.length > 0) return fromParagraphs

  return section.content
    .split('\n')
    .map((line) => line.replace(/^[\s\-*]+/, '').trim())
    .filter(Boolean)
}
