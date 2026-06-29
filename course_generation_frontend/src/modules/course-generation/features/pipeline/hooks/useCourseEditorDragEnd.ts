import { useCallback } from 'react'
import type { DropResult } from '@hello-pangea/dnd'
import { useEditorStore } from '../../../store/editorStore'

/** Shared drag-end handler for course editor DnD (sections + subtopics). */
export function useCourseEditorDragEnd() {
  const courseContent = useEditorStore((s) => s.courseContent)
  const moveSectionByIndex = useEditorStore((s) => s.moveSectionByIndex)
  const moveChildByIndex = useEditorStore((s) => s.moveChildByIndex)
  const moveChildBetweenSections = useEditorStore((s) => s.moveChildBetweenSections)

  return useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result
      if (!destination || !courseContent) return
      if (source.droppableId === destination.droppableId && source.index === destination.index) return

      if (source.droppableId === '__SECTIONS__' && destination.droppableId === '__SECTIONS__') {
        // Use pure index-based move — never broken by duplicate section IDs.
        moveSectionByIndex(source.index, destination.index)
      } else if (source.droppableId === destination.droppableId) {
        moveChildByIndex(source.droppableId, source.index, destination.index)
      } else {
        // draggableId for cross-section move is "${sectionId}-${index}"; extract the real ID.
        const realId = draggableId.replace(/-\d+$/, '')
        moveChildBetweenSections(
          source.droppableId,
          destination.droppableId,
          realId,
          destination.index,
        )
      }
    },
    [courseContent, moveSectionByIndex, moveChildByIndex, moveChildBetweenSections],
  )
}
