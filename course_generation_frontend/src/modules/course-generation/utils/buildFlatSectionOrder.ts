import type { CourseSection } from '../../types/editor'

/** Depth-first section IDs for backend reorder (L1, its children, next L1, …). */
export function buildFlatSectionOrder(sections: CourseSection[]): string[] {
  const ids: string[] = []
  for (const section of sections) {
    ids.push(section.id)
    for (const child of section.children) {
      ids.push(child.id)
    }
  }
  return ids
}
