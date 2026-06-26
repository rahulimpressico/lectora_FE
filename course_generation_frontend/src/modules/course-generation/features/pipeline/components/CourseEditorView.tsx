import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import {
  ArrowLeft,
  Eye,
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Hash,
  Clock,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  X,
  Pencil,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { ConfirmLeaveModal } from '@/shared/components/ConfirmLeaveModal'
import {
  getCourseContent,
  downloadCourseArtifact,
  syncCourseContent,
} from '@/api/editor/api'
import { loadDraft, clearDraft, createDebouncedSave } from '../../../store/courseEditorDraft'
import { useEditorStore } from '../../../store/editorStore'
import { useCourseStore, clearCourseStorage } from '../../../store/courseStore'
import { useSaveToAzure } from '../hooks/useSaveToAzure'
import { SectionNavigation } from './SectionNavigation'
import { CourseSectionCard } from './CourseSectionCard'
import { CoursePreviewModal } from './CoursePreviewModal'
import { isExpiredJobError } from '@/api/errors'
import type { CourseSection } from '../../../types/editor'

interface CourseEditorViewProps {
  jobId: string
}


function SkeletonLoader() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 px-6 py-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-5 rounded w-2/3" />
          </div>
          <div className="skeleton h-3 rounded w-full" />
          <div className="skeleton h-3 rounded w-5/6" />
          <div className="skeleton h-3 rounded w-4/5" />
        </div>
      ))}
    </div>
  )
}

export function CourseEditorView({ jobId }: CourseEditorViewProps) {
  const {
    courseContent,
    setCourseContent,
    updateCourseTitle,
    activeSectionId,
    expandedSectionIds,
    sectionEditStates,
    isPreviewOpen,
    openPreview,
    closePreview,
    expandAll,
    collapseAll,
    addSection,
    reorderSections,
    reorderChildren,
    moveChildBetweenSections,
  } = useEditorStore()

  // ── Draft / IDB ───────────────────────────────────────────────────────────
  const [draftChecked, setDraftChecked] = useState(false)
  const [draftExists, setDraftExists] = useState(false)
  const draftLoadedRef = useRef(false)
  const debouncedSaveRef = useRef(createDebouncedSave(400))

  useEffect(() => {
    const debounced = debouncedSaveRef.current
    loadDraft(jobId).then((draft) => {
      if (draft) {
        setCourseContent(draft.content)
        setOriginalSectionIds(draft.content.sections.map((s) => s.id))
        draftLoadedRef.current = true
        setDraftExists(true)
      }
      setDraftChecked(true)
    })
    return () => { debounced.cancel() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  // Auto-save snapshot to IDB after any store mutation (debounced 400 ms)
  useEffect(() => {
    if (!draftChecked || !courseContent) return
    const snapshot = useEditorStore.getState().getCourseSnapshot()
    if (snapshot) {
      debouncedSaveRef.current.schedule(jobId, snapshot)
      setDraftExists(true)
    }
    // sectionEditStates is a dep so inline edits (not yet "Saved") also trigger the auto-save
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseContent, sectionEditStates, draftChecked, jobId])

  // ── Other state ──────────────────────────────────────────────────────────
  const dirtySectionCount = [...sectionEditStates.values()].filter((s) => s.isDirty).length

  const [confirmLeave, setConfirmLeave] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [syncingBeforeSave, setSyncingBeforeSave] = useState(false)
  // Original section order captured on first content load — used for Reset Order
  const [originalSectionIds, setOriginalSectionIds] = useState<string[] | null>(null)

  const { setPhase, reset, setCourseTitle } = useCourseStore()
  const { save: saveToAzure, reset: resetSaveToAzure, status: saveStatus, result: saveResult, errorMessage: saveError } = useSaveToAzure()

  const { data: content, isLoading, error } = useQuery({
    queryKey: ['course-content', jobId],
    queryFn: () => getCourseContent(jobId),
    enabled: !!jobId,
    staleTime: 5 * 60_000,
    refetchOnMount: 'always',
    retry: 2,
  })

  // Apply API content only when no IDB draft was loaded
  useEffect(() => {
    if (draftLoadedRef.current) return
    if (content) {
      setCourseContent(content)
      setOriginalSectionIds((prev) => prev ?? content.sections.map((s) => s.id))
    }
  }, [content, setCourseContent])

  useEffect(() => {
    if (!error) return
    if (!isExpiredJobError(error)) return
    clearCourseStorage()
    reset()
    setPhase('upload')
  }, [error, reset, setPhase])

  // Clear local draft after a successful Azure save
  useEffect(() => {
    if (saveStatus === 'success') {
      void clearDraft(jobId).then(() => setDraftExists(false))
    }
  }, [saveStatus, jobId])

  // ── DnD ───────────────────────────────────────────────────────────────────
  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination || !courseContent) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    if (source.droppableId === '__SECTIONS__' && destination.droppableId === '__SECTIONS__') {
      // ── Reorder top-level sections ──────────────────────────────────────────
      const sections = [...courseContent.sections]
      const [moved] = sections.splice(source.index, 1)
      sections.splice(destination.index, 0, moved)
      reorderSections(sections)
    } else if (source.droppableId === destination.droppableId) {
      // ── Reorder children within the same parent ─────────────────────────────
      const parent = courseContent.sections.find((s) => s.id === source.droppableId)
      if (!parent) return
      const children = [...parent.children]
      const [moved] = children.splice(source.index, 1)
      children.splice(destination.index, 0, moved)
      reorderChildren(source.droppableId, children)
    } else {
      // ── Move child across sections ──────────────────────────────────────────
      moveChildBetweenSections(
        source.droppableId,
        destination.droppableId,
        draggableId,
        destination.index,
      )
    }
  }, [courseContent, reorderSections, reorderChildren, moveChildBetweenSections])

  function handleResetOrder() {
    if (!originalSectionIds || !courseContent) return
    const currentMap = new Map(courseContent.sections.map((s) => [s.id, s]))
    const reordered = originalSectionIds
      .map((id) => currentMap.get(id))
      .filter(Boolean) as CourseSection[]
    reorderSections(reordered)
  }

  const currentSectionIds = useMemo(
    () => courseContent?.sections.map((s) => s.id) ?? [],
    [courseContent?.sections],
  )

  const orderChanged =
    originalSectionIds !== null &&
    currentSectionIds.join(',') !== originalSectionIds.join(',')

  // ── Download DOCX ─────────────────────────────────────────────────────────
  async function handleDownload() {
    if (!courseContent) return
    setIsDownloading(true)
    try {
      const snapshot = useEditorStore.getState().getCourseSnapshot()
      if (snapshot) await syncCourseContent(jobId, snapshot)
      // syncCourseContent already wrote sections in the correct editor order;
      // do NOT pass sectionOrder here — it would trigger _apply_section_order_to_shared_state
      // which can produce duplicates when heading-slug IDs have changed.
      await downloadCourseArtifact(jobId)
      await clearDraft(jobId)
      setDraftExists(false)
    } finally {
      setIsDownloading(false)
    }
  }

  // ── Save to Azure ─────────────────────────────────────────────────────────
  async function handleSaveToAzure() {
    if (!courseContent) return
    setSyncingBeforeSave(true)
    try {
      const snapshot = useEditorStore.getState().getCourseSnapshot()
      if (snapshot) await syncCourseContent(jobId, snapshot)
    } catch {
      // Sync failed — proceed with Azure save anyway
    } finally {
      setSyncingBeforeSave(false)
    }
    resetSaveToAzure()
    saveToAzure({
      jobId,
      courseTitle: courseContent.courseTitle,
    })
  }

  const expandedCount = expandedSectionIds.size
  const totalSections = courseContent?.meta.sectionCount ?? 0
  const showSkeleton = !courseContent && (isLoading || !draftChecked)

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-[#f4f6f9]">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            draftExists
              ? setConfirmLeave(true)
              : setPhase('three-panel')
          }
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:block">Back</span>
        </button>

        <ConfirmLeaveModal
          open={confirmLeave}
          title="Leave without saving?"
          message="Your edits are saved locally but haven't been synced to the backend yet. Go back anyway?"
          confirmLabel="Leave"
          cancelLabel="Keep editing"
          onConfirm={() => {
            setConfirmLeave(false)
            setPhase('three-panel')
          }}
          onCancel={() => setConfirmLeave(false)}
        />

        <div className="w-px h-5 bg-slate-200 shrink-0" />

        {/* Course title */}
        <div className="flex-1 min-w-0">
          {courseContent ? (
            <>
              {isEditingTitle ? (
                <input
                  autoFocus
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  onBlur={() => {
                    const t = editTitleValue.trim() || courseContent.courseTitle
                    updateCourseTitle(t)
                    setCourseTitle(t)
                    setIsEditingTitle(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setIsEditingTitle(false)
                  }}
                  className="text-sm font-bold text-slate-900 leading-tight w-full bg-transparent border-b border-indigo-400 outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditTitleValue(courseContent.courseTitle)
                    setIsEditingTitle(true)
                  }}
                  className="group flex items-center gap-1.5 text-left w-full"
                  title="Click to edit course title"
                >
                  <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">
                    {courseContent.courseTitle}
                  </h1>
                  <Pencil
                    size={11}
                    className="shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              )}
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <BookOpen size={10} />
                  {Number.isFinite(courseContent.meta.sectionCount) ? courseContent.meta.sectionCount : 0} sections,{' '}
                  {Number.isFinite(courseContent.meta.chapterCount) ? courseContent.meta.chapterCount : 0} chapters
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Hash size={10} />
                  {(Number.isFinite(courseContent.meta.totalWordCount) ? courseContent.meta.totalWordCount : 0).toLocaleString()} words
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock size={10} />
                  {courseContent.meta.estimatedReadTime} read
                </span>
              </div>
            </>
          ) : (
            <div className="skeleton h-4 w-48 rounded" />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={<Eye size={13} />}
            onClick={openPreview}
            disabled={!courseContent}
          >
            Preview
          </Button>

          {orderChanged && (
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={handleResetOrder}
              title="Restore the original section order from source data"
            >
              Reset Order
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={<CloudUpload size={13} />}
            onClick={() => { void handleSaveToAzure() }}
            disabled={!courseContent}
            loading={syncingBeforeSave || saveStatus === 'loading'}
          >
            Save to Azure
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            onClick={() => { void handleDownload() }}
            disabled={!courseContent || isDownloading}
          >
            {isDownloading ? 'Saving…' : 'Download DOCX'}
          </Button>
        </div>
      </div>

      {/* ── Save to Azure status banner ───────────────────────────────────── */}
      {saveStatus === 'loading' && (
        <div className="mx-4 mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-[12px] text-indigo-700">
          Uploading to Azure… large courses can take several minutes. Please keep this tab open.
        </div>
      )}
      {saveStatus === 'success' && saveResult && (
        <div className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={14} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-emerald-800">Course saved to Azure</p>
            <p className="text-[11px] text-emerald-600 mt-0.5 break-all leading-relaxed">
              {saveResult.blobPath}
            </p>
            {saveResult.savedAt && (
              <p className="text-[11px] text-emerald-500 mt-0.5">
                Saved {new Date(saveResult.savedAt).toLocaleString()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={resetSaveToAzure}
            className="shrink-0 text-emerald-400 hover:text-emerald-600 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-red-700">Failed to save to Azure</p>
            <p className="text-[11px] text-red-500 mt-0.5 leading-relaxed">
              {saveError ?? 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
          <button
            type="button"
            onClick={resetSaveToAzure}
            className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* AI processing bar */}
      {Array.from(sectionEditStates.values()).some((s) => s.isAIProcessing) && (
        <div className="h-[2px] bg-slate-100 shrink-0">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 animate-[shimmer_1.5s_ease-in-out_infinite]"
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* ── Content area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* Left nav */}
        {courseContent && (
          <SectionNavigation
            sections={courseContent.sections}
            activeSectionId={activeSectionId}
          />
        )}

        {/* Main editor */}
        <div className="flex-1 overflow-y-auto">
          {showSkeleton ? (
            <SkeletonLoader />
          ) : error && !courseContent ? (
            <div className="flex items-center justify-center h-40 text-sm text-red-500 px-6">
              Failed to load course content. Please try refreshing.
            </div>
          ) : courseContent ? (
            <div className="max-w-4xl mx-auto px-6 py-6">

              {/* Toolbar row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-slate-500">
                    {expandedCount} of {totalSections} sections expanded
                  </p>
                  {dirtySectionCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-700">
                      ● {dirtySectionCount} unsaved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition-colors"
                  >
                    <ChevronDown size={11} />
                    Expand all
                  </button>
                  <span className="text-slate-300 text-xs">·</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition-colors"
                  >
                    <ChevronRight size={11} />
                    Collapse all
                  </button>
                </div>
              </div>

              {/* Section cards — drag-reorderable */}
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="__SECTIONS__" type="SECTION">
                  {(droppableProvided) => (
                    <div
                      ref={droppableProvided.innerRef}
                      {...droppableProvided.droppableProps}
                      className="space-y-3"
                    >
                      {(courseContent?.sections ?? []).map((section, index) => (
                        <Draggable
                          key={section.id}
                          draggableId={section.id}
                          index={index}
                        >
                          {(draggableProvided, draggableSnapshot) => (
                            <div
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              className={draggableSnapshot.isDragging ? 'opacity-90 shadow-xl' : ''}
                            >
                              <CourseSectionCard
                                section={section}
                                jobId={jobId}
                                depth={0}
                                index={index}
                                dragHandleProps={draggableProvided.dragHandleProps}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {droppableProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Add Section button */}
              <button
                type="button"
                onClick={() => { addSection() }}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/50 transition-all duration-150 group"
              >
                <Plus size={15} className="group-hover:scale-110 transition-transform" />
                Add Section
              </button>

            </div>
          ) : null}
        </div>
      </div>

      {/* Processing overlay while loading */}
      {showSkeleton && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin text-brand-500" />
            Loading course content…
          </div>
        </div>
      )}

      {/* Preview modal */}
      {isPreviewOpen && courseContent && (
        <CoursePreviewModal
          courseContent={courseContent}
          onClose={closePreview}
        />
      )}
    </div>
  )
}
