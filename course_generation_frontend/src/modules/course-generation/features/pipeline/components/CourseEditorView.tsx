import { useState, useMemo, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { ArrowLeft, Eye, RotateCcw, Plus } from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { ConfirmLeaveModal } from '@/shared/components/ConfirmLeaveModal'
import { useEditorStore } from '../../../store/editorStore'
import { useCourseStore, clearCourseStorage } from '../../../store/courseStore'
import { useCourseEditorSession } from '../hooks/useCourseEditorSession'
import { useCourseEditorDragEnd } from '../hooks/useCourseEditorDragEnd'
import { CourseEditorShell } from './CourseEditorShell'
import { CourseSectionCard } from './CourseSectionCard'
import { CoursePreviewModal } from './CoursePreviewModal'
import type { CourseContent, CourseSection } from '../../../types/editor'

interface CourseEditorViewProps {
  jobId: string
}

export function CourseEditorView({ jobId }: CourseEditorViewProps) {
  const { setPhase, reset, setCourseTitle } = useCourseStore()
  const {
    courseContent,
    isPreviewOpen,
    openPreview,
    closePreview,
    addSection,
    reorderSections,
  } = useEditorStore()

  const [confirmLeave, setConfirmLeave] = useState(false)
  const [originalSectionIds, setOriginalSectionIds] = useState<string[] | null>(null)

  const captureInitialOrder = useCallback((content: CourseContent) => {
    setOriginalSectionIds((prev) => prev ?? content.sections.map((s) => s.id))
  }, [])

  const handleExpiredJob = useCallback(() => {
    clearCourseStorage()
    reset()
    setPhase('upload')
  }, [reset, setPhase])

  const session = useCourseEditorSession({
    jobId,
    onContentLoaded: captureInitialOrder,
    onExpiredJob: handleExpiredJob,
  })

  // ── DnD ──────────────────────────────────────────────────────────────────
  const onDragEnd = useCourseEditorDragEnd()

  // ── Reset Order ───────────────────────────────────────────────────────────
  function handleResetOrder() {
    if (!originalSectionIds || !courseContent) return
    const map = new Map(courseContent.sections.map((s) => [s.id, s]))
    const reordered = originalSectionIds.map((id) => map.get(id)).filter(Boolean) as CourseSection[]
    reorderSections(reordered)
  }

  const currentSectionIds = useMemo(
    () => courseContent?.sections.map((s) => s.id) ?? [],
    [courseContent?.sections],
  )
  const orderChanged = originalSectionIds !== null && currentSectionIds.join(',') !== originalSectionIds.join(',')

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-[#f4f6f9]">
      <ConfirmLeaveModal
        open={confirmLeave}
        title="Leave without saving?"
        message="Your edits are saved locally but haven't been synced to the backend yet. Go back anyway?"
        confirmLabel="Leave"
        cancelLabel="Keep editing"
        onConfirm={() => { setConfirmLeave(false); setPhase('three-panel') }}
        onCancel={() => setConfirmLeave(false)}
      />

      <CourseEditorShell
        session={session}
        onTitleSave={(t) => setCourseTitle(t)}
        topBarLeading={
          <button
            type="button"
            onClick={() => session.draftExists ? setConfirmLeave(true) : setPhase('three-panel')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:block">Back</span>
          </button>
        }
        extraActions={
          <>
            <Button variant="secondary" size="sm" icon={<Eye size={13} />} onClick={openPreview} disabled={!courseContent}>
              Preview
            </Button>
            {orderChanged && (
              <Button variant="secondary" size="sm" icon={<RotateCcw size={13} />} onClick={handleResetOrder} title="Restore the original section order from source data">
                Reset Order
              </Button>
            )}
          </>
        }
      >
        {/* DnD-wrapped section cards */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="__SECTIONS__" type="SECTION">
            {(p) => (
              <div ref={p.innerRef} {...p.droppableProps} className="space-y-3">
                {(courseContent?.sections ?? []).map((section, index) => (
                  <Draggable key={section.id} draggableId={section.id} index={index}>
                    {(dp, ds) => (
                      <div ref={dp.innerRef} {...dp.draggableProps} className={ds.isDragging ? 'opacity-90 shadow-xl' : ''}>
                        <CourseSectionCard section={section} jobId={jobId} depth={0} index={index} dragHandleProps={dp.dragHandleProps} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {p.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add Section */}
        <button
          type="button"
          onClick={() => { addSection() }}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/50 transition-all duration-150 group"
        >
          <Plus size={15} className="group-hover:scale-110 transition-transform" />
          Add Section
        </button>
      </CourseEditorShell>

      {/* Preview modal */}
      {isPreviewOpen && courseContent && (
        <CoursePreviewModal courseContent={courseContent} onClose={closePreview} />
      )}
    </div>
  )
}
