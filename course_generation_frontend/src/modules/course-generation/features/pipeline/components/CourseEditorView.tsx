import { useEffect, useRef, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Reorder, useDragControls, AnimatePresence } from 'framer-motion'
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
import { getCourseContent, downloadCourseArtifact, saveSectionContent } from '@/api/editor/api'
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

// ── Drag-handle wrapper ──────────────────────────────────────────────────────
// Keeps Reorder.Item + useDragControls co-located so CourseSectionCard
// only receives a plain onDragHandlePointerDown callback.
// onDragCommit is called when the drag gesture ends to flush the new order
// into the Zustand store — keeping visual reorder decoupled from store commits.
function DraggableSectionItem({
  section,
  index,
  jobId,
  onDragCommit,
}: {
  section: CourseSection
  index: number
  jobId: string
  onDragCommit?: () => void
}) {
  const dragControls = useDragControls()
  return (
    // as="div" is required — default "li" inside a "div" group breaks layout measurement
    <Reorder.Item
      as="div"
      value={section.id}
      dragListener={false}
      dragControls={dragControls}
      style={{ position: 'relative' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      onDragEnd={() => onDragCommit?.()}
    >
      <CourseSectionCard
        section={section}
        jobId={jobId}
        depth={0}
        index={index}
        onDragHandlePointerDown={(e) => dragControls.start(e)}
      />
    </Reorder.Item>
  )
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
  } = useEditorStore()

  // IDs never shown in section order (special sections rendered at fixed positions in DOCX)
  const SPECIAL_SECTION_IDS = new Set([
    'course-overview',
    'course-learning-objectives',
    'course-conclusion',
  ])

  const dirtySectionCount = [...sectionEditStates.values()].filter((s) => s.isDirty).length

  async function handleDownload() {
    if (!courseContent) return
    setIsDownloading(true)
    try {
      // Flush all dirty sections to the backend before generating the DOCX
      const allSections: CourseSection[] = []
      const collect = (sections: CourseSection[]) => {
        sections.forEach((s) => { allSections.push(s); collect(s.children) })
      }
      collect(courseContent.sections)

      const flushJobs = allSections
        .filter((s) => sectionEditStates.get(s.id)?.isDirty)
        .map((s) => {
          const content = sectionEditStates.get(s.id)?.currentContent ?? s.content
          return saveSectionContent(jobId, s.id, content, s.sectionType).catch(() => {
            // Ignore individual save errors; proceed with download
          })
        })
      await Promise.all(flushJobs)
      await downloadCourseArtifact(jobId)
    } finally {
      setIsDownloading(false)
    }
  }

  const [confirmPendingEdits, setConfirmPendingEdits] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
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

  useEffect(() => {
    if (content) {
      setCourseContent(content)
      // Capture original order only on first load — functional update ensures single capture
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

  // ── DnD local order state ──────────────────────────────────────────────────
  // Track section IDs separately from full objects so Reorder.Item uses stable
  // primitive values and the order survives store re-renders.
  const sectionIds = useMemo(
    () => courseContent?.sections.map((s) => s.id) ?? [],
    [courseContent?.sections],
  )
  const [localSectionIds, setLocalSectionIds] = useState<string[]>(sectionIds)

  // Ref always holds the latest localSectionIds — avoids stale closures in
  // commitSectionOrder which is called from onDragEnd event handlers.
  const localSectionIdsRef = useRef(localSectionIds)
  useEffect(() => {
    localSectionIdsRef.current = localSectionIds
  }, [localSectionIds])

  // Sync local order when the set of section IDs changes (add/delete/reset).
  // NOTE: join(',') changes on BOTH set membership changes AND reorders, so this
  // also fires after commitSectionOrder — but localSectionIds already matches, no-op.
  const sectionIdsKey = sectionIds.join(',')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSectionIds(sectionIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIdsKey])

  // Map id → full section for rendering
  const sectionById = useMemo(() => {
    const m = new Map<string, CourseSection>()
    courseContent?.sections.forEach((s) => m.set(s.id, s))
    return m
  }, [courseContent?.sections])

  // handleReorder updates ONLY the visual order during drag — no store write.
  // Calling reorderSections here would trigger a Zustand update → re-render →
  // framer-motion's internal order[] resets → active drag loses tracking.
  function handleReorder(newIds: string[]) {
    setLocalSectionIds(newIds)
  }

  // Commit the current visual order to the Zustand store on drag end.
  // Called via onDragEnd on each Reorder.Item.
  function commitSectionOrder() {
    const currentIds = localSectionIdsRef.current
    const reordered = currentIds
      .map((id) => sectionById.get(id))
      .filter(Boolean) as CourseSection[]
    reorderSections(reordered)
  }

  // Reset both local state and store to the original API-returned order.
  function handleResetOrder() {
    if (!originalSectionIds || !courseContent) return
    const currentMap = new Map(courseContent.sections.map((s) => [s.id, s]))
    // Preserve current section content; only restore order
    const reordered = originalSectionIds
      .map((id) => currentMap.get(id))
      .filter(Boolean) as CourseSection[]
    setLocalSectionIds(originalSectionIds)
    reorderSections(reordered)
  }

  // Build a flat ordered list of content section IDs (top-level + children)
  // for the Save-to-Azure payload. Special sections have fixed DOCX positions.
  function buildSectionOrder(sections: CourseSection[]): string[] {
    const ids: string[] = []
    sections.forEach((s) => {
      if (!SPECIAL_SECTION_IDS.has(s.id)) {
        ids.push(s.id)
        s.children.forEach((c) => ids.push(c.id))
      }
    })
    return ids
  }

  const orderChanged =
    originalSectionIds !== null &&
    localSectionIds.join(',') !== originalSectionIds.join(',')

  const expandedCount = expandedSectionIds.size
  const totalSections = courseContent?.meta.sectionCount ?? 0

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-[#f4f6f9]">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            dirtySectionCount > 0
              ? setConfirmPendingEdits(true)
              : setPhase('three-panel')
          }
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:block">Back</span>
        </button>

        <ConfirmLeaveModal
          open={confirmPendingEdits}
          title="Discard unsaved edits?"
          message={`You have unsaved edits in ${dirtySectionCount} section${dirtySectionCount !== 1 ? 's' : ''}. Going back will discard all changes.`}
          confirmLabel="Discard & go back"
          cancelLabel="Keep editing"
          onConfirm={() => {
            setConfirmPendingEdits(false)
            setPhase('three-panel')
          }}
          onCancel={() => setConfirmPendingEdits(false)}
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

          <div className="flex flex-col items-end">
            <Button
              variant="secondary"
              size="sm"
              icon={<CloudUpload size={13} />}
              onClick={() => {
                if (dirtySectionCount > 0 && !confirmPendingEdits) {
                  setConfirmPendingEdits(true)
                  return
                }
                setConfirmPendingEdits(false)
                resetSaveToAzure()
                saveToAzure({
                  jobId,
                  courseTitle: courseContent?.courseTitle,
                  sectionOrder: courseContent ? buildSectionOrder(courseContent.sections) : undefined,
                })
              }}
              disabled={!courseContent}
              loading={saveStatus === 'loading'}
            >
              Save to Azure
            </Button>

            {confirmPendingEdits && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] max-w-xs text-left">
                <p className="font-semibold text-amber-800">
                  You have {dirtySectionCount} unsaved edit{dirtySectionCount !== 1 ? 's' : ''}.
                </p>
                <p className="mt-0.5 text-amber-700">
                  Only saved edits will be included in the export.
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmPendingEdits(false)}
                  className="mt-1.5 text-amber-600 underline text-[11px] hover:text-amber-800"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

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
          {isLoading ? (
            <SkeletonLoader />
          ) : error ? (
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
              {/* AnimatePresence wraps the group (not inside it) — prevents layout interference */}
              <AnimatePresence initial={false} mode="popLayout">
                <Reorder.Group
                  axis="y"
                  values={localSectionIds}
                  onReorder={handleReorder}
                  as="div"
                  className="space-y-3"
                >
                  {localSectionIds.map((id, index) => {
                    const section = sectionById.get(id)
                    if (!section) return null
                    return (
                      <DraggableSectionItem
                        key={id}
                        section={section}
                        index={index}
                        jobId={jobId}
                        onDragCommit={commitSectionOrder}
                      />
                    )
                  })}
                </Reorder.Group>
              </AnimatePresence>

              {/* Add Section button */}
              <button
                type="button"
                onClick={() => addSection()}
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
      {isLoading && (
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
