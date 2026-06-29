import type { CourseContent, CourseSection, SectionEditState } from '../types/editor'
import type { AliaContext, AliaContextSection } from '../types/alia'

interface CourseStoreSlice {
  audience: string
  detectedRuleFamily: string
}

interface EditorContextSlice {
  activeSectionId: string | null
  focusedSectionId: string | null
  sectionEditStates: Map<string, SectionEditState>
}

function first80words(text: string): string {
  return text.split(/\s+/).slice(0, 80).join(' ')
}

function flattenSections(sections: CourseSection[]): AliaContextSection[] {
  const result: AliaContextSection[] = []

  function walk(list: CourseSection[]) {
    for (const s of list) {
      result.push({
        id: s.id,
        title: s.title,
        level: s.level,
        sectionType: s.sectionType ?? 'content',
        wordCount: s.wordCount,
        order: s.order,
        childIds: s.children.map((c) => c.id),
        snippet: first80words(s.content),
      })
      if (s.children.length > 0) walk(s.children)
    }
  }

  walk(sections)
  return result
}

export function buildAliaContext(
  snapshot: CourseContent,
  courseStore: CourseStoreSlice,
  editorContext: EditorContextSlice,
): AliaContext {
  const recentlyEditedSectionIds = Array.from(editorContext.sectionEditStates.entries())
    .filter(([, state]) => state.isDirty)
    .map(([id]) => id)

  return {
    courseTitle: snapshot.courseTitle,
    courseType: snapshot.courseType,
    audience: courseStore.audience || 'insurance professionals',
    ruleFamily: courseStore.detectedRuleFamily || '',
    meta: snapshot.meta,
    sections: flattenSections(snapshot.sections),
    activeSectionId: editorContext.activeSectionId,
    focusedSectionId: editorContext.focusedSectionId,
    recentlyEditedSectionIds,
  }
}
