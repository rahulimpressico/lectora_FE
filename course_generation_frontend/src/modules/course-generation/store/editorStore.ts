import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
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

  // ── Section/subtopic CRUD ───────────────────────────────────────────────────
  addSection: (afterSectionId?: string | null) => string
  addSubtopic: (parentSectionId: string) => string
  moveSubtopicToSection: (subtopicId: string, targetParentId: string) => void
  deleteSection: (sectionId: string) => void
  reorderSections: (newSections: CourseSection[]) => void
  reorderChildren: (parentId: string, newChildren: CourseSection[]) => void
  moveChildBetweenSections: (fromParentId: string, toParentId: string, childId: string, toIndex: number) => void

  openPreview: () => void
  closePreview: () => void
  resetEditor: () => void
  /** Returns a CourseContent snapshot with all in-progress textarea edits merged in. */
  getCourseSnapshot: () => CourseContent | null
}

// ─── Title sanitization ───────────────────────────────────────────────────────
// These are A2 pipeline internal field names that must never be visible to users.
const INTERNAL_FIELD_NAMES = new Set([
  'outline_lesson', 'heading', 'body_paragraphs', 'section_id',
  'is_parent_overview', 'word_count', 'status', 'level',
])

function sanitizeTitle(title: string | undefined, fallback: string): string {
  const t = (title ?? '').trim()
  if (!t || INTERNAL_FIELD_NAMES.has(t.toLowerCase())) return fallback
  return t
}

function sanitizeSection(section: CourseSection, index: number): CourseSection {
  const level = section.level ?? 1
  const fallback = level === 1 ? `Section ${index + 1}` : `Subtopic ${index + 1}`
  return { ...section, title: sanitizeTitle(section.title, fallback) }
}

function sanitizeSections(sections: CourseSection[]): CourseSection[] {
  return sections.map((s, i) => ({
    ...sanitizeSection(s, i),
    children: s.children.map((c, ci) => sanitizeSection(c, ci)),
  }))
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

function collectDescendantIds(section: CourseSection): string[] {
  const ids: string[] = []
  function walk(s: CourseSection) {
    s.children.forEach((c) => {
      ids.push(c.id)
      walk(c)
    })
  }
  walk(section)
  return ids
}

function findSection(sections: CourseSection[], id: string): CourseSection | null {
  for (const s of sections) {
    if (s.id === id) return s
    const found = findSection(s.children, id)
    if (found) return found
  }
  return null
}

function removeFromTree(sections: CourseSection[], idsToRemove: Set<string>): CourseSection[] {
  return sections
    .filter((s) => !idsToRemove.has(s.id))
    .map((s) => ({ ...s, children: removeFromTree(s.children, idsToRemove) }))
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

function makeNewSection(overrides: Partial<CourseSection> & { level: 1 | 2 | 3 }): CourseSection {
  return {
    id: uuidv4(),
    title: overrides.level === 1 ? 'New Section' : 'New Subtopic',
    content: '',
    learningObjectives: [],
    wordCount: 0,
    hasKnowledgeCheck: false,
    order: 0,
    children: [],
    ...overrides,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useEditorStore = create<EditorStoreState>()(
  devtools(
    (set, get) => ({
      courseContent: null,
      sectionEditStates: new Map(),
      activeSectionId: null,
      isPreviewOpen: false,
      expandedSectionIds: new Set(),

      // ── Content loading — preserves title & unsaved edits on re-fetch ─────────
      setCourseContent: (content) =>
        set((s) => {
          // Sanitize titles: never show raw internal pipeline field names in the UI
          const sanitizedSections = sanitizeSections(content.sections)
          const sanitizedContent = { ...content, sections: sanitizedSections }

          // Preserve user-edited title on re-fetch
          const courseTitle = s.courseContent
            ? s.courseContent.courseTitle
            : sanitizedContent.courseTitle

          const editStates = new Map<string, SectionEditState>()
          function initState(section: CourseSection) {
            const existing = s.sectionEditStates.get(section.id)
            if (existing && existing.isDirty) {
              // Preserve unsaved draft; update originalContent to latest server value
              editStates.set(section.id, {
                ...defaultEditState(section),
                currentContent: existing.currentContent,
                originalContent: section.content,
                isDirty: existing.currentContent !== section.content,
                isEditing: existing.isEditing,
              })
            } else {
              editStates.set(section.id, defaultEditState(section))
            }
            section.children.forEach(initState)
          }
          sanitizedContent.sections.forEach(initState)

          return {
            courseContent: { ...sanitizedContent, courseTitle },
            sectionEditStates: editStates,
            // Preserve expand/collapse state on re-fetch; initialize on first load
            expandedSectionIds:
              s.expandedSectionIds.size > 0
                ? s.expandedSectionIds
                : new Set(collectAllIds(sanitizedContent.sections)),
            activeSectionId: s.activeSectionId ?? sanitizedContent.sections[0]?.id ?? null,
          }
        }),

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
              // Keep paragraphs in sync so RichContentRenderer doesn't fall back
              // to the original (stale) structured data after isDirty is cleared.
              paragraphs: [{ type: 'text', content }],
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
              paragraphs: [{ type: 'text', content }],
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

      // ── CRUD ─────────────────────────────────────────────────────────────────

      addSection: (afterSectionId) => {
        const newSection = makeNewSection({ level: 1 })
        set((s) => {
          if (!s.courseContent) return s

          let newSections: CourseSection[]
          if (afterSectionId) {
            const idx = s.courseContent.sections.findIndex(
              (sec) => sec.id === afterSectionId,
            )
            if (idx === -1) {
              newSections = [...s.courseContent.sections, newSection]
            } else {
              newSections = [
                ...s.courseContent.sections.slice(0, idx + 1),
                newSection,
                ...s.courseContent.sections.slice(idx + 1),
              ]
            }
          } else {
            newSections = [...s.courseContent.sections, newSection]
          }
          newSections = newSections.map((sec, i) => ({ ...sec, order: i }))

          const newEditStates = new Map(s.sectionEditStates)
          newEditStates.set(newSection.id, defaultEditState(newSection))

          const newExpanded = new Set(s.expandedSectionIds)
          newExpanded.add(newSection.id)

          return {
            courseContent: { ...s.courseContent, sections: newSections },
            sectionEditStates: newEditStates,
            expandedSectionIds: newExpanded,
            activeSectionId: newSection.id,
          }
        })
        return newSection.id
      },

      addSubtopic: (parentSectionId) => {
        const currentSections = get().courseContent?.sections ?? []
        const parent = findSection(currentSections, parentSectionId)
        const childLevel: 2 | 3 = parent?.level === 1 ? 2 : 3
        const newSubtopic = makeNewSection({ level: childLevel, parentId: parentSectionId })

        set((s) => {
          if (!s.courseContent) return s

          const newSections = updateSectionTree(
            s.courseContent.sections,
            parentSectionId,
            (p) => ({
              ...p,
              children: [
                ...p.children,
                { ...newSubtopic, order: p.children.length },
              ],
            }),
          )

          const newEditStates = new Map(s.sectionEditStates)
          newEditStates.set(newSubtopic.id, defaultEditState(newSubtopic))

          const newExpanded = new Set(s.expandedSectionIds)
          newExpanded.add(parentSectionId)
          newExpanded.add(newSubtopic.id)

          return {
            courseContent: { ...s.courseContent, sections: newSections },
            sectionEditStates: newEditStates,
            expandedSectionIds: newExpanded,
            activeSectionId: newSubtopic.id,
          }
        })

        return newSubtopic.id
      },

      moveSubtopicToSection: (subtopicId, targetParentId) =>
        set((s) => {
          if (!s.courseContent) return s

          // Find the subtopic in the tree
          const subtopic = findSection(s.courseContent.sections, subtopicId)
          if (!subtopic) return s

          const movedSubtopic = { ...subtopic, parentId: targetParentId }

          // Remove from current parent
          const withoutSubtopic = s.courseContent.sections.map((sec) => ({
            ...sec,
            children: sec.children
              .filter((c) => c.id !== subtopicId)
              .map((c, i) => ({ ...c, order: i })),
          }))

          // Add to new parent at end
          const withNewParent = updateSectionTree(
            withoutSubtopic,
            targetParentId,
            (parent) => ({
              ...parent,
              children: [
                ...parent.children,
                { ...movedSubtopic, order: parent.children.length },
              ],
            }),
          )

          return { courseContent: { ...s.courseContent, sections: withNewParent } }
        }),

      deleteSection: (sectionId) =>
        set((s) => {
          if (!s.courseContent) return s
          const target = findSection(s.courseContent.sections, sectionId)
          if (!target) return s

          const idsToRemove = new Set([
            sectionId,
            ...collectDescendantIds(target),
          ])

          const newSections = removeFromTree(s.courseContent.sections, idsToRemove)

          const newEditStates = new Map(s.sectionEditStates)
          idsToRemove.forEach((id) => newEditStates.delete(id))

          const newExpanded = new Set(s.expandedSectionIds)
          idsToRemove.forEach((id) => newExpanded.delete(id))

          const newActiveId =
            s.activeSectionId && idsToRemove.has(s.activeSectionId)
              ? newSections[0]?.id ?? null
              : s.activeSectionId

          return {
            courseContent: { ...s.courseContent, sections: newSections },
            sectionEditStates: newEditStates,
            expandedSectionIds: newExpanded,
            activeSectionId: newActiveId,
          }
        }),

      reorderSections: (newSections) =>
        set((s) => {
          if (!s.courseContent) return s
          return {
            courseContent: {
              ...s.courseContent,
              sections: newSections.map((sec, i) => ({ ...sec, order: i })),
            },
          }
        }),

      reorderChildren: (parentId, newChildren) =>
        set((s) => {
          if (!s.courseContent) return s
          const updatedSections = updateSectionTree(
            s.courseContent.sections,
            parentId,
            (parent) => ({
              ...parent,
              children: newChildren.map((child, i) => ({ ...child, order: i })),
            }),
          )
          return { courseContent: { ...s.courseContent, sections: updatedSections } }
        }),

      moveChildBetweenSections: (fromParentId, toParentId, childId, toIndex) =>
        set((s) => {
          if (!s.courseContent) return s
          // Find and detach the child from the source parent
          let movedChild: CourseSection | null = null
          const afterDetach = s.courseContent.sections.map((sec) => {
            if (sec.id !== fromParentId) return sec
            const child = sec.children.find((c) => c.id === childId)
            if (!child) return sec
            movedChild = child
            return { ...sec, children: sec.children.filter((c) => c.id !== childId) }
          })
          if (!movedChild) return s
          const child = movedChild as CourseSection
          // Attach to destination parent at the given index with updated parentId
          const updated = { ...child, parentId: toParentId }
          const afterInsert = afterDetach.map((sec) => {
            if (sec.id !== toParentId) return sec
            const children = [...sec.children]
            children.splice(toIndex, 0, updated)
            return { ...sec, children: children.map((c, i) => ({ ...c, order: i })) }
          })
          return { courseContent: { ...s.courseContent, sections: afterInsert } }
        }),

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

      getCourseSnapshot: () => {
        const { courseContent, sectionEditStates } = get()
        if (!courseContent) return null
        function mergeSection(section: CourseSection): CourseSection {
          const editState = sectionEditStates.get(section.id)
          return {
            ...section,
            content: editState !== undefined ? editState.currentContent : section.content,
            children: section.children.map(mergeSection),
          }
        }
        return { ...courseContent, sections: courseContent.sections.map(mergeSection) }
      },
    }),
    { name: 'editor-store' },
  ),
)
