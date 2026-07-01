import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { current, enableMapSet } from 'immer'
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
  moveSectionByIndex: (from: number, to: number) => void
  moveChildByIndex: (parentId: string, from: number, to: number) => void
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

/**
 * Deduplicate top-level sections by ID.
 * The backend sometimes emits a "summary" entry (no children) followed by a
 * "full" entry (with children) for the same section ID. Keep whichever copy
 * has the most children; if tied keep the last occurrence.
 */
function deduplicateSections(sections: CourseSection[]): CourseSection[] {
  const seen = new Map<string, CourseSection>()
  for (const s of sections) {
    const existing = seen.get(s.id)
    if (!existing || s.children.length >= existing.children.length) {
      seen.set(s.id, s)
    }
  }
  // Preserve the order of the first occurrence of each id
  const result: CourseSection[] = []
  const added = new Set<string>()
  for (const s of sections) {
    if (!added.has(s.id)) {
      result.push(seen.get(s.id)!)
      added.add(s.id)
    }
  }
  return result
}

// ─── Pure read helpers ────────────────────────────────────────────────────────
function collectAllIds(sections: CourseSection[]): string[] {
  const ids: string[] = []
  function walk(list: CourseSection[]) {
    list.forEach((s) => { ids.push(s.id); walk(s.children) })
  }
  walk(sections)
  return ids
}

function collectDescendantIds(section: CourseSection): string[] {
  const ids: string[] = []
  function walk(s: CourseSection) {
    s.children.forEach((c) => { ids.push(c.id); walk(c) })
  }
  walk(section)
  return ids
}

/** Read-only tree search — safe on both plain objects and immer drafts. */
function findSection(sections: CourseSection[], id: string): CourseSection | null {
  for (const s of sections) {
    if (s.id === id) return s
    const found = findSection(s.children, id)
    if (found) return found
  }
  return null
}

/** Mutating tree search — returns the draft node so callers can write to it. */
function findInDraft(sections: CourseSection[], id: string): CourseSection | undefined {
  for (const s of sections) {
    if (s.id === id) return s
    const found = findInDraft(s.children, id)
    if (found) return found
  }
  return undefined
}

/** Remove all IDs in the set from the tree in place. */
function removeFromTreeMut(sections: CourseSection[], idsToRemove: Set<string>) {
  for (let i = sections.length - 1; i >= 0; i--) {
    if (idsToRemove.has(sections[i].id)) {
      sections.splice(i, 1)
    } else {
      removeFromTreeMut(sections[i].children, idsToRemove)
    }
  }
}

// ─── Factory helpers ──────────────────────────────────────────────────────────
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

function makeNewSection(overrides: Partial<CourseSection> & { level: 1 | 2 | 3 }): CourseSection {
  return {
    id: crypto.randomUUID(),
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

// Immer draft support for Map/Set state (sectionEditStates, expandedSectionIds)
enableMapSet()

// ─── Store ────────────────────────────────────────────────────────────────────
export const useEditorStore = create<EditorStoreState>()(
  devtools(
    immer((set, get) => ({
      courseContent: null,
      sectionEditStates: new Map(),
      activeSectionId: null,
      isPreviewOpen: false,
      expandedSectionIds: new Set(),

      // ── Content loading — preserves title & unsaved edits on re-fetch ─────────
      setCourseContent: (content) => set((draft) => {
        const sanitizedSections = sanitizeSections(deduplicateSections(content.sections))
        const sanitizedContent = { ...content, sections: sanitizedSections }
        const courseTitle = draft.courseContent?.courseTitle ?? sanitizedContent.courseTitle

        // Snapshot old edit states before we overwrite courseContent
        const oldEditStates = current(draft.sectionEditStates)
        draft.courseContent = { ...sanitizedContent, courseTitle }

        draft.sectionEditStates.clear()
        function initState(section: CourseSection) {
          const existing = oldEditStates.get(section.id)
          if (existing && existing.isDirty) {
            // Preserve unsaved draft; update originalContent to latest server value
            draft.sectionEditStates.set(section.id, {
              ...defaultEditState(section),
              currentContent: existing.currentContent,
              originalContent: section.content,
              isDirty: existing.currentContent !== section.content,
              isEditing: existing.isEditing,
            })
          } else {
            draft.sectionEditStates.set(section.id, defaultEditState(section))
          }
          section.children.forEach(initState)
        }
        sanitizedContent.sections.forEach(initState)

        // Preserve expand/collapse on re-fetch; initialize on first load
        if (draft.expandedSectionIds.size === 0) {
          collectAllIds(sanitizedContent.sections).forEach((id) => draft.expandedSectionIds.add(id))
        }
        draft.activeSectionId ??= sanitizedContent.sections[0]?.id ?? null
      }),

      updateCourseTitle: (title) => set((draft) => {
        if (draft.courseContent) draft.courseContent.courseTitle = title
      }),

      setActiveSectionId: (id) => set((draft) => { draft.activeSectionId = id }),

      expandSection:  (id) => set((draft) => { draft.expandedSectionIds.add(id) }),
      collapseSection: (id) => set((draft) => { draft.expandedSectionIds.delete(id) }),
      toggleSection:  (id) => set((draft) => {
        if (draft.expandedSectionIds.has(id)) draft.expandedSectionIds.delete(id)
        else draft.expandedSectionIds.add(id)
      }),
      expandAll: () => set((draft) => {
        if (!draft.courseContent) return
        collectAllIds(draft.courseContent.sections as CourseSection[]).forEach((id) =>
          draft.expandedSectionIds.add(id),
        )
      }),
      collapseAll: () => set((draft) => { draft.expandedSectionIds.clear() }),

      startEditing: (sectionId) => set((draft) => {
        const s = draft.sectionEditStates.get(sectionId)
        if (s) s.isEditing = true
      }),

      updateEditContent: (sectionId, content) => set((draft) => {
        const s = draft.sectionEditStates.get(sectionId)
        if (!s) return
        s.currentContent = content
        s.isDirty = content !== s.originalContent
      }),

      saveSection: (sectionId, content) => set((draft) => {
        if (!draft.courseContent) return
        const section = findInDraft(draft.courseContent.sections as CourseSection[], sectionId)
        if (section) {
          section.content = content
          section.wordCount = content.trim().split(/\s+/).filter(Boolean).length
          // Keep paragraphs in sync so RichContentRenderer doesn't fall back
          // to the original (stale) structured data after isDirty is cleared.
          section.paragraphs = [{ type: 'text', content }]
        }
        const s = draft.sectionEditStates.get(sectionId)
        if (s) {
          s.isEditing = false
          s.isDirty = false
          s.originalContent = content
          s.currentContent = content
          s.isSaving = false
        }
      }),

      cancelEditing: (sectionId) => set((draft) => {
        const s = draft.sectionEditStates.get(sectionId)
        if (!s) return
        s.isEditing = false
        s.isDirty = false
        s.currentContent = s.originalContent
      }),

      updateSectionTitle: (sectionId, title) => set((draft) => {
        if (!draft.courseContent) return
        const section = findInDraft(draft.courseContent.sections as CourseSection[], sectionId)
        if (section) section.title = title
      }),

      setAIProcessing: (sectionId, operation) => set((draft) => {
        const s = draft.sectionEditStates.get(sectionId)
        if (s) { s.isAIProcessing = true; s.currentAIOperation = operation }
      }),

      applyAIResult: (sectionId, content) => set((draft) => {
        if (!draft.courseContent) return
        const section = findInDraft(draft.courseContent.sections as CourseSection[], sectionId)
        if (section) {
          section.content = content
          section.wordCount = content.trim().split(/\s+/).filter(Boolean).length
          section.paragraphs = [{ type: 'text', content }]
        }
        const s = draft.sectionEditStates.get(sectionId)
        if (s) {
          s.isAIProcessing = false
          s.currentAIOperation = undefined
          s.isEditing = false
          s.isDirty = false
          s.currentContent = content
          s.originalContent = content
        }
      }),

      clearAIOperation: (sectionId) => set((draft) => {
        const s = draft.sectionEditStates.get(sectionId)
        if (s) { s.isAIProcessing = false; s.currentAIOperation = undefined }
      }),

      // ── CRUD ─────────────────────────────────────────────────────────────────

      addSection: (afterSectionId) => {
        const newSection = makeNewSection({ level: 1 })
        set((draft) => {
          if (!draft.courseContent) return
          const sections = draft.courseContent.sections
          if (afterSectionId) {
            const idx = sections.findIndex((s) => s.id === afterSectionId)
            if (idx === -1) sections.push(newSection)
            else sections.splice(idx + 1, 0, newSection)
          } else {
            sections.push(newSection)
          }
          sections.forEach((s, i) => { s.order = i })
          draft.sectionEditStates.set(newSection.id, defaultEditState(newSection))
          draft.expandedSectionIds.add(newSection.id)
          draft.activeSectionId = newSection.id
        })
        return newSection.id
      },

      addSubtopic: (parentSectionId) => {
        const currentSections = get().courseContent?.sections ?? []
        const parent = findSection(currentSections, parentSectionId)
        const childLevel: 2 | 3 = parent?.level === 1 ? 2 : 3
        const newSubtopic = makeNewSection({ level: childLevel, parentId: parentSectionId })

        set((draft) => {
          if (!draft.courseContent) return
          const parentNode = findInDraft(draft.courseContent.sections as CourseSection[], parentSectionId)
          if (parentNode) parentNode.children.push({ ...newSubtopic, order: parentNode.children.length })
          draft.sectionEditStates.set(newSubtopic.id, defaultEditState(newSubtopic))
          draft.expandedSectionIds.add(parentSectionId)
          draft.expandedSectionIds.add(newSubtopic.id)
          draft.activeSectionId = newSubtopic.id
        })
        return newSubtopic.id
      },

      moveSubtopicToSection: (subtopicId, targetParentId) => set((draft) => {
        if (!draft.courseContent) return
        const sections = draft.courseContent.sections as CourseSection[]

        // Detach from current parent (only searches top-level children)
        let movedSubtopic: CourseSection | null = null
        for (const sec of sections) {
          const idx = sec.children.findIndex((c) => c.id === subtopicId)
          if (idx !== -1) {
            movedSubtopic = { ...current(sec.children[idx]), parentId: targetParentId }
            sec.children.splice(idx, 1)
            sec.children.forEach((c, i) => { c.order = i })
            break
          }
        }
        if (!movedSubtopic) return

        const targetParent = findInDraft(sections, targetParentId)
        if (targetParent) targetParent.children.push({ ...movedSubtopic, order: targetParent.children.length })
      }),

      deleteSection: (sectionId) => set((draft) => {
        if (!draft.courseContent) return
        const plainSections = current(draft.courseContent.sections) as CourseSection[]
        const target = findSection(plainSections, sectionId)
        if (!target) return

        const idsToRemove = new Set([sectionId, ...collectDescendantIds(target)])
        removeFromTreeMut(draft.courseContent.sections as CourseSection[], idsToRemove)
        idsToRemove.forEach((id) => {
          draft.sectionEditStates.delete(id)
          draft.expandedSectionIds.delete(id)
        })
        if (draft.activeSectionId && idsToRemove.has(draft.activeSectionId)) {
          draft.activeSectionId = (draft.courseContent.sections[0] as CourseSection | undefined)?.id ?? null
        }
      }),

      reorderSections: (newSections) => set((draft) => {
        if (!draft.courseContent) return
        // Move existing draft proxies one at a time with splice — the only
        // immer-safe way to reorder. Sort() and array replacement both caused
        // phantom duplicate entries with immer v11.
        const arr = draft.courseContent.sections as CourseSection[]
        for (let to = 0; to < newSections.length; to++) {
          const from = arr.findIndex(s => s.id === newSections[to].id)
          if (from !== to) {
            const [item] = arr.splice(from, 1)
            arr.splice(to, 0, item)
          }
          arr[to].order = to
        }
      }),

      reorderChildren: (parentId, newChildren) => set((draft) => {
        if (!draft.courseContent) return
        const parent = findInDraft(draft.courseContent.sections as CourseSection[], parentId)
        if (!parent) return
        const arr = parent.children as CourseSection[]
        for (let to = 0; to < newChildren.length; to++) {
          const from = arr.findIndex(c => c.id === newChildren[to].id)
          if (from !== to) {
            const [item] = arr.splice(from, 1)
            arr.splice(to, 0, item)
          }
          arr[to].order = to
        }
      }),

      // Pure index-based moves — always correct even when section IDs are duplicated
      // (duplicate IDs are a known backend data issue; ID-based findIndex breaks on them).
      moveSectionByIndex: (from, to) => set((draft) => {
        if (!draft.courseContent) return
        const arr = draft.courseContent.sections as CourseSection[]
        if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return
        const [item] = arr.splice(from, 1)
        arr.splice(to, 0, item)
        for (let i = 0; i < arr.length; i++) arr[i].order = i
      }),

      moveChildByIndex: (parentId, from, to) => set((draft) => {
        if (!draft.courseContent) return
        const parent = findInDraft(draft.courseContent.sections as CourseSection[], parentId)
        if (!parent) return
        const arr = parent.children as CourseSection[]
        if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return
        const [item] = arr.splice(from, 1)
        arr.splice(to, 0, item)
        for (let i = 0; i < arr.length; i++) arr[i].order = i
      }),

      moveChildBetweenSections: (fromParentId, toParentId, childId, toIndex) => set((draft) => {
        if (!draft.courseContent) return
        const sections = draft.courseContent.sections as CourseSection[]
        const fromParent = findInDraft(sections, fromParentId)
        if (!fromParent) return
        const childIdx = fromParent.children.findIndex((c) => c.id === childId)
        if (childIdx === -1) return
        const [child] = fromParent.children.splice(childIdx, 1)
        const movedChild = { ...current(child), parentId: toParentId }
        const toParent = findInDraft(sections, toParentId)
        if (!toParent) return
        toParent.children.splice(toIndex, 0, movedChild)
        toParent.children.forEach((c, i) => { c.order = i })
      }),

      openPreview:  () => set((draft) => { draft.isPreviewOpen = true }),
      closePreview: () => set((draft) => { draft.isPreviewOpen = false }),

      resetEditor: () => set((draft) => {
        draft.courseContent = null
        draft.sectionEditStates.clear()
        draft.activeSectionId = null
        draft.isPreviewOpen = false
        draft.expandedSectionIds.clear()
      }),

      getCourseSnapshot: () => {
        const { courseContent, sectionEditStates } = get()
        if (!courseContent) return null
        function mergeSection(section: CourseSection): CourseSection {
          const editState = sectionEditStates.get(section.id)
          if (editState?.isDirty) {
            // Normalize paragraphs for dirty sections so heading-type entries
            // from the original backend payload don't duplicate the section title
            // in the generated docx (mirrors what saveSection does on explicit save).
            return {
              ...section,
              content: editState.currentContent,
              paragraphs: [{ type: 'text', content: editState.currentContent }],
              children: section.children.map(mergeSection),
            }
          }
          return {
            ...section,
            content: editState !== undefined ? editState.currentContent : section.content,
            children: section.children.map(mergeSection),
          }
        }
        return { ...courseContent, sections: courseContent.sections.map(mergeSection) }
      },
    })),
    { name: 'editor-store' },
  ),
)
