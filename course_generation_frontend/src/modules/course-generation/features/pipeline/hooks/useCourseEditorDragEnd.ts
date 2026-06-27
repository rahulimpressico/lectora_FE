import { useCallback } from 'react'
import type { DropResult } from '@hello-pangea/dnd'
import { useEditorStore } from '../../../store/editorStore'

/** Shared drag-end handler for course editor DnD (sections + subtopics). */
export function useCourseEditorDragEnd() {
  const courseContent = useEditorStore((s) => s.courseContent)
  const reorderSections = useEditorStore((s) => s.reorderSections)
  const reorderChildren = useEditorStore((s) => s.reorderChildren)
  const moveChildBetweenSections = useEditorStore((s) => s.moveChildBetweenSections)

  return useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result
      if (!destination || !courseContent) return
      if (source.droppableId === destination.droppableId && source.index === destination.index) return

      if (source.droppableId === '__SECTIONS__' && destination.droppableId === '__SECTIONS__') {
        const sections = [...courseContent.sections]
        const [moved] = sections.splice(source.index, 1)
        sections.splice(destination.index, 0, moved)
        reorderSections(sections)
      } else if (source.droppableId === destination.droppableId) {
        const parent = courseContent.sections.find((s) => s.id === source.droppableId)
        if (!parent) return
        const children = [...parent.children]
        const [moved] = children.splice(source.index, 1)
        children.splice(destination.index, 0, moved)
        reorderChildren(source.droppableId, children)
      } else {
        moveChildBetweenSections(
          source.droppableId,
          destination.droppableId,
          draggableId,
          destination.index,
        )
      }
    },
    [courseContent, reorderSections, reorderChildren, moveChildBetweenSections],
  )
}
