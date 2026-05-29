import { useEffect } from 'react'
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
} from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { getCourseContent, downloadCourseArtifact } from '@/api/editor/api'
import { useEditorStore } from '../../store/editorStore'
import { useCourseStore } from '../../store/courseStore'
import { SectionNavigation } from './SectionNavigation'
import { CourseSectionCard } from './CourseSectionCard'
import { CoursePreviewModal } from '../preview/CoursePreviewModal'

interface CourseEditorViewProps {
  jobId: string
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

  const { setPhase } = useCourseStore()

  const { data: content, isLoading, error } = useQuery({
    queryKey: ['course-content', jobId],
    queryFn: () => getCourseContent(jobId),
    enabled: !!jobId,
    staleTime: Infinity, // content doesn't change during this session
  })

  useEffect(() => {
    if (content) setCourseContent(content)
  }, [content, setCourseContent])

  const expandedCount = expandedSectionIds.size
  const totalSections = courseContent?.meta.sectionCount ?? 0

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f4f6f9]">

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
