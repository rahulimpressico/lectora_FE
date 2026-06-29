import type { AliaAction } from '../types/alia'
import type { CourseSection, CourseContent, AIOperationType } from '../types/editor'
import {
  deleteSectionAPI,
  saveSectionContent,
  performAIOperation,
} from '@/api/editor/api'

// Explicit shape so we don't depend on EditorStoreState being exported
export type DispatchEditorStore = {
  courseContent: CourseContent | null
  reorderSections: (sections: CourseSection[]) => void
  moveSubtopicToSection: (subtopicId: string, targetParentId: string) => void
  addSection: (afterSectionId?: string | null) => string
  addSubtopic: (parentSectionId: string) => string
  deleteSection: (sectionId: string) => void
  updateSectionTitle: (sectionId: string, title: string) => void
  saveSection: (sectionId: string, content: string) => void
  updateCourseTitle: (title: string) => void
  setActiveSectionId: (id: string | null) => void
  expandSection: (id: string) => void
  openPreview: () => void
  setAIProcessing: (sectionId: string, operation: AIOperationType) => void
  applyAIResult: (sectionId: string, content: string) => void
  clearAIOperation: (sectionId: string) => void
  getCourseSnapshot: () => CourseContent | null
}

export type DispatchSession = {
  handleDownload: () => Promise<void>
  handleSaveToAzure: () => Promise<void>
}

export interface DispatchResult {
  message: string
  affectedSectionId: string | null
}

/** Recursively finds a section anywhere in the tree. */
function findSection(sections: CourseSection[], id: string): CourseSection | undefined {
  for (const s of sections) {
    if (s.id === id) return s
    const found = findSection(s.children, id)
    if (found) return found
  }
}

/** Validates a section ID exists in the current course tree. */
function validateSectionId(id: string, store: DispatchEditorStore): boolean {
  if (!store.courseContent) return false
  return !!findSection(store.courseContent.sections, id)
}

/**
 * Dispatches an AliaAction against the editor store and backend APIs.
 * Returns a result with human-readable message and the primary affected section ID.
 */
export async function dispatchAliaAction(
  action: AliaAction,
  store: DispatchEditorStore,
  session: DispatchSession,
  jobId: string,
): Promise<DispatchResult> {
  switch (action.type) {
    case 'AI_OP': {
      if (!validateSectionId(action.sectionId, store)) {
        return { message: `I couldn't find that section. Please try again.`, affectedSectionId: null }
      }
      const snapshot = store.getCourseSnapshot()
      const section = snapshot ? findSection(snapshot.sections, action.sectionId) : undefined
      const content = section?.content ?? ''

      store.setAIProcessing(action.sectionId, action.operation)
      try {
        const result = await performAIOperation({
          jobId,
          sectionId: action.sectionId,
          operation: action.operation,
          content,
          userPrompt: action.userPrompt,
        })
        store.applyAIResult(result.sectionId, result.content)
        return { message: `Done. I've ${action.operation}d that section.`, affectedSectionId: action.sectionId }
      } catch {
        store.clearAIOperation(action.sectionId)
        return { message: `The AI operation failed. Please try again.`, affectedSectionId: null }
      }
    }

    case 'BATCH_AI_OP': {
      const validIds = action.sectionIds.filter((id) => validateSectionId(id, store))
      if (validIds.length === 0) return { message: `I couldn't find those sections.`, affectedSectionId: null }

      const snapshot = store.getCourseSnapshot()
      let done = 0
      for (const sid of validIds) {
        const section = snapshot ? findSection(snapshot.sections, sid) : undefined
        const content = section?.content ?? ''
        store.setAIProcessing(sid, action.operation)
        try {
          const result = await performAIOperation({
            jobId,
            sectionId: sid,
            operation: action.operation,
            content,
            userPrompt: action.userPrompt,
          })
          store.applyAIResult(result.sectionId, result.content)
          done++
        } catch {
          store.clearAIOperation(sid)
        }
      }
      return {
        message: `Done. I've ${action.operation}d ${done} of ${validIds.length} sections.`,
        affectedSectionId: validIds[0] ?? null,
      }
    }

    case 'REORDER': {
      if (!store.courseContent) return { message: `No course loaded.`, affectedSectionId: null }
      const { sections } = store.courseContent
      const byId = new Map(sections.map((s) => [s.id, s]))
      const reordered = action.newOrder
        .map((id) => byId.get(id))
        .filter(Boolean) as typeof sections
      if (reordered.length === 0) return { message: `I couldn't match those section IDs.`, affectedSectionId: null }
      // Append any sections not mentioned in the new order at the end
      const inOrder = new Set(action.newOrder)
      sections.filter((s) => !inOrder.has(s.id)).forEach((s) => reordered.push(s))
      store.reorderSections(reordered)
      return { message: `Sections reordered.`, affectedSectionId: null }
    }

    case 'MOVE_SUBTOPIC': {
      if (!validateSectionId(action.subtopicId, store) || !validateSectionId(action.toParentId, store)) {
        return { message: `I couldn't find that section or its target parent.`, affectedSectionId: null }
      }
      store.moveSubtopicToSection(action.subtopicId, action.toParentId)
      return { message: `Subtopic moved.`, affectedSectionId: action.subtopicId }
    }

    case 'ADD_SECTION': {
      const newId = store.addSection(action.afterSectionId ?? null)
      if (action.title) store.updateSectionTitle(newId, action.title)
      return { message: `Added a new section: "${action.title}".`, affectedSectionId: newId }
    }

    case 'ADD_SUBTOPIC': {
      if (!validateSectionId(action.parentId, store)) {
        return { message: `I couldn't find that section.`, affectedSectionId: null }
      }
      const newId = store.addSubtopic(action.parentId)
      if (action.title) store.updateSectionTitle(newId, action.title)
      return { message: `Added subtopic: "${action.title}".`, affectedSectionId: newId }
    }

    case 'DELETE_SECTION': {
      if (!validateSectionId(action.sectionId, store)) {
        return { message: `I couldn't find that section.`, affectedSectionId: null }
      }
      await deleteSectionAPI(jobId, action.sectionId)
      store.deleteSection(action.sectionId)
      return { message: `Section deleted.`, affectedSectionId: null }
    }

    case 'RENAME_SECTION': {
      if (!validateSectionId(action.sectionId, store)) {
        return { message: `I couldn't find that section.`, affectedSectionId: null }
      }
      store.updateSectionTitle(action.sectionId, action.title)
      await saveSectionContent(jobId, action.sectionId, '', undefined, action.title)
      return { message: `Section renamed to "${action.title}".`, affectedSectionId: action.sectionId }
    }

    case 'EDIT_SECTION': {
      if (!validateSectionId(action.sectionId, store)) {
        return { message: `I couldn't find that section.`, affectedSectionId: null }
      }
      store.saveSection(action.sectionId, action.content)
      await saveSectionContent(jobId, action.sectionId, action.content)
      return { message: `Section updated.`, affectedSectionId: action.sectionId }
    }

    case 'UPDATE_TITLE': {
      store.updateCourseTitle(action.courseTitle)
      return { message: `Course title updated to "${action.courseTitle}".`, affectedSectionId: null }
    }

    case 'NAVIGATE': {
      if (!validateSectionId(action.sectionId, store)) {
        return { message: `I couldn't find that section.`, affectedSectionId: null }
      }
      store.setActiveSectionId(action.sectionId)
      store.expandSection(action.sectionId)
      setTimeout(() => {
        document.getElementById(`section-${action.sectionId}`)?.scrollIntoView({
          behavior: 'smooth', block: 'start',
        })
      }, 150)
      return { message: `Navigated to that section.`, affectedSectionId: action.sectionId }
    }

    case 'OPEN_PREVIEW': {
      store.openPreview()
      return { message: `Opening preview.`, affectedSectionId: null }
    }

    case 'DOWNLOAD_DOCX': {
      await session.handleDownload()
      return { message: `Downloading your course document.`, affectedSectionId: null }
    }

    case 'SAVE_AZURE': {
      await session.handleSaveToAzure()
      return { message: `Saving to Azure.`, affectedSectionId: null }
    }

    default:
      return { message: `I'm not sure how to do that yet.`, affectedSectionId: null }
  }
}

/** Actions that require explicit user confirmation before executing. */
export function isDestructiveAction(action: AliaAction): boolean {
  return (
    action.type === 'DELETE_SECTION' ||
    (action.type === 'BATCH_AI_OP' && action.sectionIds.length >= 5)
  )
}
