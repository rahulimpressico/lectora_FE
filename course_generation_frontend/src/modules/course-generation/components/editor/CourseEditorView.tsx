import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
} from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { getCourseContent, downloadCourseArtifact } from '@/api/editor/api'
import { useEditorStore } from '../../store/editorStore'
import { useCourseStore } from '../../store/courseStore'
import { useSaveToAzure } from '../../hooks/useSaveToAzure'
import { SectionNavigation } from './SectionNavigation'
import { CourseSectionCard } from './CourseSectionCard'
import { CoursePreviewModal } from '../preview/CoursePreviewModal'

interface CourseEditorViewProps {
  jobId: string
}

function isExpiredJobError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    message.includes('unknown or expired jobid') ||
    message.includes('unknown jobid') ||
    message.includes('expired jobid')
  )
}

function SkeletonLoader() {
  return (
    <div className="max-w-3xl mx-auto space-y-4 px-6 py-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="skeleton h-5 rounded w-2/3" />
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
    activeSectionId,
    expandedSectionIds,
    sectionEditStates,
    isPreviewOpen,
    openPreview,
    closePreview,
    expandAll,
    collapseAll,
  } = useEditorStore()

  const sections = useEditorStore((s) => s.sectionEditStates)
  const dirtySectionCount = [...sections.values()].filter(s => s.isDirty).length

  const [confirmPendingEdits, setConfirmPendingEdits] = useState(false)

  const { setPhase, reset } = useCourseStore()
  

  const { save: saveToAzure, reset: resetSaveToAzure, status: saveStatus, result: saveResult, errorMessage: saveError } = useSaveToAzure()

  const { data: content, isLoading, error } = useQuery({
    queryKey: ['course-content', jobId],
    queryFn: () => getCourseContent(jobId),
    enabled: !!jobId,
    staleTime: Infinity, // content doesn't change during this session
  })

  useEffect(() => {
    if (content) setCourseContent(content)
  }, [content, setCourseContent])

  useEffect(() => {
    if (!error) return
    if (!isExpiredJobError(error)) return
    reset()
    setPhase('upload')
  }, [error, reset, setPhase])

  const expandedCount = expandedSectionIds.size
  const totalSections = courseContent?.meta.sectionCount ?? 0

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-[#f4f6f9]">

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPhase('three-panel')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:block">Back</span>
        </button>

        <div className="w-px h-5 bg-slate-200 shrink-0" />

        <div className="flex-1 min-w-0">
          {courseContent ? (
            <>
              <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">
                {courseContent.courseTitle}
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <BookOpen size={10} />
                  {courseContent.meta.sectionCount} sections, {courseContent.meta.chapterCount} chapters
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Hash size={10} />
                  {courseContent.meta.totalWordCount.toLocaleString()} words
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
                saveToAzure(jobId)
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
                  Only saved edits will be included in the exported DOCX.
                  Click <strong>Save to Azure</strong> again to export the last saved version, or save your edits first.
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
            icon={<Download size={13} />}
            onClick={() => downloadCourseArtifact(jobId)}
            disabled={!courseContent}
          >
            Download DOCX
          </Button>
        </div>
      </div>

      {/* ── Save to Azure status banner ───────────────────────────────── */}
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
      {Array.from(sectionEditStates.values()).some(s => s.isAIProcessing) && (
        <div className="h-[2px] bg-slate-100 shrink-0">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '100%' }} />
        </div>
      )}

      {/* ── Content area ───────────────────────────────────────────────── */}
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
            <div className="max-w-3xl mx-auto px-6 py-6">
              {/* Expand / collapse toolbar */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-slate-400">
                  {expandedCount} of {totalSections} sections expanded
                </p>
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

              {/* Section cards */}
              <div className="space-y-4 fade-in">
                {courseContent.sections.map((section) => (
                  <CourseSectionCard
                    key={section.id}
                    section={section}
                    jobId={jobId}
                    depth={0}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Processing overlay while AI runs ─────────────────────────── */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin text-brand-500" />
            Loading course content…
          </div>
        </div>
      )}

      {/* ── Preview modal ──────────────────────────────────────────────── */}
      {isPreviewOpen && courseContent && (
        <CoursePreviewModal
          courseContent={courseContent}
          onClose={closePreview}
        />
      )}
    </div>
  )
}
