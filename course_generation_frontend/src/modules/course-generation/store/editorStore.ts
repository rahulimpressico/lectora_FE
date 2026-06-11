import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  CourseContent,
  CourseSection,
  SectionEditState,
  AIOperationType,
} from '../types/editor'

// ─── Store shape ──────────────────────────────────────────────────────────────
interface EditorStoreState {
  courseContent: CourseContent | null
  sectionEditStates: Map<string, SectionEditState>
  activeSectionId: string | null
  isPreviewOpen: boolean
  expandedSectionIds: Set<string>

  setCourseContent: (content: CourseContent) => void
  updateCourseTitle: (title: string) => void
  setActiveSectionId: (id: string | null) => void

  expandSection: (id: string) => void
  collapseSection: (id: string) => void
  toggleSection: (id: string) => void
  expandAll: () => void
  collapseAll: () => void

  startEditing: (sectionId: string) => void
  updateEditContent: (sectionId: string, content: string) => void
  saveSection: (sectionId: string, content: string) => void
  cancelEditing: (sectionId: string) => void
  updateSectionTitle: (sectionId: string, title: string) => void

  setAIProcessing: (sectionId: string, operation: AIOperationType) => void
  applyAIResult: (sectionId: string, content: string) => void
  clearAIOperation: (sectionId: string) => void

  openPreview: () => void
  closePreview: () => void
  resetEditor: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function collectAllIds(sections: CourseSection[]): string[] {
  const ids: string[] = []
  function walk(list: CourseSection[]) {
    list.forEach((s) => {
      ids.push(s.id)
      walk(s.children)
    })
  }
  walk(sections)
  return ids
}

function defaultEditState(section: CourseSection): SectionEditState {
  return {
    isEditing: false,
    isDirty: false,
    currentContent: section.content,
    originalContent: section.content,
    isSaving: false,
    isAIProcessing: false,
    isExpanded: section.level === 1,
  }
}

function updateSectionTree(
  sections: CourseSection[],
  sectionId: string,
  updater: (s: CourseSection) => CourseSection,
): CourseSection[] {
  return sections.map((s) => {
    if (s.id === sectionId) return updater(s)
    if (s.children.length > 0) {
      return { ...s, children: updateSectionTree(s.children, sectionId, updater) }
    }
    return s
  })
}

function patchEditState(
  states: Map<string, SectionEditState>,
  id: string,
  patch: Partial<SectionEditState>,
): Map<string, SectionEditState> {
  const existing = states.get(id)
  if (!existing) return states
  const next = new Map(states)
  next.set(id, { ...existing, ...patch })
  return next
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useEditorStore = create<EditorStoreState>()(
  devtools(
    (set) => ({
      courseContent: null,
      sectionEditStates: new Map(),
      activeSectionId: null,
      isPreviewOpen: false,
      expandedSectionIds: new Set(),

      setCourseContent: (content) => {
        const editStates = new Map<string, SectionEditState>()
        function initState(section: CourseSection) {
          editStates.set(section.id, defaultEditState(section))
          section.children.forEach(initState)
        }
        content.sections.forEach(initState)

        set({
          courseContent: content,
          sectionEditStates: editStates,
          expandedSectionIds: new Set(collectAllIds(content.sections)),
          activeSectionId: content.sections[0]?.id ?? null,
        })
      },

      updateCourseTitle: (title) =>
        set((s) =>
          s.courseContent
            ? { courseContent: { ...s.courseContent, courseTitle: title } }
            : {},
        ),

      setActiveSectionId: (id) => set({ activeSectionId: id }),

      expandSection: (id) =>
        set((s) => {
          const next = new Set(s.expandedSectionIds)
          next.add(id)
          return { expandedSectionIds: next }
        }),

      collapseSection: (id) =>
        set((s) => {
          const next = new Set(s.expandedSectionIds)
          next.delete(id)
          return { expandedSectionIds: next }
        }),

      toggleSection: (id) =>
        set((s) => {
          const next = new Set(s.expandedSectionIds)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return { expandedSectionIds: next }
        }),

      expandAll: () =>
        set((s) => {
          if (!s.courseContent) return s
          return {
            expandedSectionIds: new Set(collectAllIds(s.courseContent.sections)),
          }
        }),

      collapseAll: () => set({ expandedSectionIds: new Set() }),

      startEditing: (sectionId) =>
        set((s) => ({
          sectionEditStates: patchEditState(s.sectionEditStates, sectionId, {
            isEditing: true,
          }),
        })),

      updateEditContent: (sectionId, content) =>
        set((s) => {
          const existing = s.sectionEditStates.get(sectionId)
          if (!existing) return s
          return {
            sectionEditStates: patchEditState(s.sectionEditStates, sectionId, {
              currentContent: content,
              isDirty: content !== existing.originalContent,
            }),
          }
        }),

      saveSection: (sectionId, content) =>
        set((s) => {
          if (!s.courseContent) return s
          const updatedSections = updateSectionTree(
            s.courseContent.sections,
            sectionId,
            (sec) => ({
              ...sec,
              content,
              wordCount: content.trim().split(/\s+/).filter(Boolean).length,
            }),
          )
          return {
            courseContent: { ...s.courseContent, sections: updatedSections },
            sectionEditStates: patchEditState(s.sectionEditStates, sectionId, {
              isEditing: false,
              isDirty: false,
              originalContent: content,
              currentContent: content,
              isSaving: false,
            }),
          }
        }),

      cancelEditing: (sectionId) =>
        set((s) => {
          const existing = s.sectionEditStates.get(sectionId)
          if (!existing) return s
          return {
            sectionEditStates: patchEditState(s.sectionEditStates, sectionId, {
              isEditing: false,
              isDirty: false,
              currentContent: existing.originalContent,
            }),
          }
        }),

      updateSectionTitle: (sectionId, title) =>
        set((s) => {
          if (!s.courseContent) return s
          const updatedSections = updateSectionTree(
            s.courseContent.sections,
            sectionId,
            (sec) => ({ ...sec, title }),
          )
          return { courseContent: { ...s.courseContent, sections: updatedSections } }
        }),

      setAIProcessing: (sectionId, operation) =>
        set((s) => ({
          sectionEditStates: patchEditState(s.sectionEditStates, sectionId, {
            isAIProcessing: true,
            currentAIOperation: operation,
          }),
        })),

      applyAIResult: (sectionId, content) =>
        set((s) => {
          if (!s.courseContent) return s
          const updatedSections = updateSectionTree(
            s.courseContent.sections,
            sectionId,
            (sec) => ({
              ...sec,
              content,
              wordCount: content.trim().split(/\s+/).filter(Boolean).length,
            }),
          )
          return {
            courseContent: { ...s.courseContent, sections: updatedSections },
            sectionEditStates: patchEditState(s.sectionEditStates, sectionId, {
              isAIProcessing: false,
              currentAIOperation: undefined,
              isEditing: false,
              isDirty: false,
              currentContent: content,
              originalContent: content,
            }),
          }
        }),

      clearAIOperation: (sectionId) =>
        set((s) => ({
          sectionEditStates: patchEditState(s.sectionEditStates, sectionId, {
            isAIProcessing: false,
            currentAIOperation: undefined,
          }),
        })),

      openPreview: () => set({ isPreviewOpen: true }),
      closePreview: () => set({ isPreviewOpen: false }),

      resetEditor: () =>
        set({
          courseContent: null,
          sectionEditStates: new Map(),
          activeSectionId: null,
          isPreviewOpen: false,
          expandedSectionIds: new Set(),
        }),
    }),
    { name: 'editor-store' },
  ),
)
