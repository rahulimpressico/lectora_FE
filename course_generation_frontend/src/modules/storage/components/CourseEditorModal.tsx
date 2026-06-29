/**
 * CourseEditorModal
 *
 * Full-screen overlay opened from the Asset Library. Uses CourseEditorShell
 * (topbar, banners, AI indicator) in 'raw' content mode so it can render its
 * own two-tab layout: an Editor tab with SectionNavigation + section cards,
 * and a Preview tab with CoursePreviewPane. Draft persistence and save/download
 * logic live in useCourseEditorSession.
 */

import { useState, useEffect, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useEditorStore } from '@/modules/course-generation/store/editorStore'
import { clearDraft } from '@/modules/course-generation/store/courseEditorDraft'
import { updateCourseTitleAPI } from '@/api/editor/api'
import { useCourseEditorSession } from '@/modules/course-generation/features/pipeline/hooks/useCourseEditorSession'
import { useCourseEditorDragEnd } from '@/modules/course-generation/features/pipeline/hooks/useCourseEditorDragEnd'
import { CourseEditorShell } from '@/modules/course-generation/features/pipeline/components/CourseEditorShell'
import { CoursePreviewPane } from '@/modules/course-generation/features/pipeline/components/CoursePreviewPane'
import { SectionNavigation } from '@/modules/course-generation/features/pipeline/components/SectionNavigation'
import { CourseSectionCard } from '@/modules/course-generation/features/pipeline/components/CourseSectionCard'
import { ConfirmLeaveModal } from '@/shared/components/ConfirmLeaveModal'
import { AIAssistantLabel, AIAssistantOverlay } from '@/modules/course-generation/features/pipeline/components/AIAssistant'

interface CourseEditorModalProps {
  jobId: string
  /** Course storage slug — speeds up Azure artifact lookup. */
  courseSlug?: string
  onClose: () => void
}

export function CourseEditorModal({ jobId, courseSlug, onClose }: CourseEditorModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)

  const {
    courseContent,
    activeSectionId,
    expandedSectionIds,
    sectionEditStates,
    expandAll,
    collapseAll,
    resetEditor,
  } = useEditorStore()

  const session = useCourseEditorSession({ jobId, courseSlug })
  const onDragEnd = useCourseEditorDragEnd()

  // ── Close logic ────────────────────────────────────────────────────────────
  const doClose = useCallback(() => {
    session.cancelDraftSave()
    resetEditor()
    onClose()
  }, [session, resetEditor, onClose])

  const handleClose = useCallback(() => {
    if (session.draftExists) setConfirmLeave(true)
    else doClose()
  }, [session.draftExists, doClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const expandedCount = expandedSectionIds.size
  const totalSections = courseContent?.meta.sectionCount ?? 0
  const dirtySectionCount = [...sectionEditStates.values()].filter((s) => s.isDirty).length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f6f9]">
      <ConfirmLeaveModal
        open={confirmLeave}
        title="Leave without saving?"
        message="Your edits are saved locally but haven't been synced to the backend yet. Close anyway?"
        confirmLabel="Discard & close"
        cancelLabel="Keep editing"
        onConfirm={() => {
          void clearDraft(jobId).then(() => {
            session.setDraftExists(false)
            setConfirmLeave(false)
            doClose()
          })
        }}
        onCancel={() => setConfirmLeave(false)}
      />

      <CourseEditorShell
        session={session}
        contentMode="raw"
        showAzureSave={activeTab === 'editor'}
        onTitleSave={(t) => { void updateCourseTitleAPI(jobId, t) }}
        extraActions={
          activeTab === 'editor' ? (
            <AIAssistantLabel onClick={() => setIsAIAssistantOpen(true)} />
          ) : undefined
        }
        topBarCenter={
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 shrink-0">
            {(['editor', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 capitalize',
                  activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        }
        topBarTrailing={
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all duration-150 active:scale-90"
          >
            <X size={13} />
          </button>
        }
      >
        {/* ── Editor tab ──────────────────────────────────────────────────── */}
        <div className={cn('flex flex-1 min-h-0', activeTab !== 'editor' && 'hidden')} aria-hidden={activeTab !== 'editor'}>
          <SectionNavigation sections={courseContent?.sections ?? []} activeSectionId={activeSectionId} />
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-400">{expandedCount} of {totalSections} sections expanded</p>
                  {dirtySectionCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-700">
                      ● {dirtySectionCount} unsaved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={expandAll} className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition-colors">
                    <ChevronDown size={11} /> Expand all
                  </button>
                  <span className="text-slate-300 text-xs">·</span>
                  <button type="button" onClick={collapseAll} className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition-colors">
                    <ChevronRight size={11} /> Collapse all
                  </button>
                </div>
              </div>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="__SECTIONS__" type="SECTION">
                  {(drop) => (
                    <div ref={drop.innerRef} {...drop.droppableProps} className="space-y-4 fade-in">
                      {courseContent?.sections.map((section, idx) => (
                        <Draggable key={`${section.id}-${idx}`} draggableId={`${section.id}-${idx}`} index={idx}>
                          {(drag, ds) => (
                            <div
                              ref={drag.innerRef as React.Ref<HTMLDivElement>}
                              {...drag.draggableProps}
                              style={drag.draggableProps.style as CSSProperties}
                              className={ds.isDragging ? 'opacity-90 shadow-xl' : ''}
                            >
                              <CourseSectionCard section={section} jobId={jobId} depth={0} index={idx} dragHandleProps={drag.dragHandleProps} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {drop.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        </div>

        {/* ── Preview tab ─────────────────────────────────────────────────── */}
        {courseContent && (
          <div className={cn('flex flex-1 min-h-0', activeTab !== 'preview' && 'hidden')} aria-hidden={activeTab !== 'preview'}>
            <CoursePreviewPane
              courseContent={courseContent}
              onDownload={() => { void session.handleDownload() }}
            />
          </div>
        )}
      </CourseEditorShell>

      <AnimatePresence>
        {isAIAssistantOpen && (
          <AIAssistantOverlay
            onClose={() => setIsAIAssistantOpen(false)}
            jobId={jobId}
            session={{
              handleDownload: session.handleDownload,
              handleSaveToAzure: session.handleSaveToAzure,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
