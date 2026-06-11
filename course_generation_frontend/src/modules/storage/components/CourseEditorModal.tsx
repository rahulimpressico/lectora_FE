/**
 * CourseEditorModal
 *
 * Full-screen overlay opened when a user clicks a generated course DOCX in the
 * Asset Library.  Provides two tabs:
 *
 *  Editor  — same section-based editing UI as the main course editor (backed by
 *             the global editorStore so AI operations, dirty-tracking, and save
 *             all work exactly the same way)
 *  Preview — formatted read-only render of the course content, matching the
 *             same CoursePreviewModal layout used after generation
 *
 * Content is loaded once via React Query (shares the ['course-content', jobId]
 * cache with the main editor), then fed into both tabs.  Both panels stay
 * mounted at all times so unsaved in-progress edits in the Editor tab are not
 * lost when the user temporarily switches to Preview.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  Download,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Hash,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckSquare2,
  Layers,
  ImageOff,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { getCourseContent, downloadCourseArtifact } from '@/api/editor/api'
import { useEditorStore } from '@/modules/course-generation/store/editorStore'
import { useSaveToAzure } from '@/modules/course-generation/hooks/useSaveToAzure'
import { SectionNavigation } from '@/modules/course-generation/components/editor/SectionNavigation'
import { CourseSectionCard } from '@/modules/course-generation/components/editor/CourseSectionCard'
import { Button } from '@/shared/components/Button'
import type { CourseContent, CourseSection, SectionImage } from '@/modules/course-generation/types/editor'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CourseEditorModalProps {
  jobId: string
  /** Course storage slug from the blob path — speeds up Azure artifact lookup. */
  courseSlug?: string
  onClose: () => void
}

// ─── Preview tab internals (inlined to avoid re-exporting CoursePreviewModal's
//     overlay shell — we're already inside a full-screen overlay) ──────────────

function SectionImageView({ image }: { image: SectionImage }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const src = `/api/storage/file?path=${encodeURIComponent(image.blobPath)}&source=artifacts`

  if (status === 'error') {
    return (
      <div className="my-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-400">
        <ImageOff size={14} className="shrink-0" />
        <span className="text-[11.5px]">{image.caption || image.altText || image.fileName}</span>
      </div>
    )
  }
  return (
    <figure className="my-6">
      {status === 'loading' && (
        <div className="skeleton w-full rounded-xl" style={{ aspectRatio: '16/9' }} />
      )}
      <img
        src={src}
        alt={image.altText || image.caption || image.fileName}
        loading="lazy"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={cn(
          'w-full h-auto rounded-xl block shadow-sm shadow-slate-200/80 transition-opacity duration-500',
          status === 'loaded' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none',
        )}
      />
      {status === 'loaded' && image.caption && (
        <figcaption className="mt-2.5 text-center text-[11.5px] text-slate-400 leading-relaxed px-4">
          {image.caption}
        </figcaption>
      )}
    </figure>
  )
}

function PreviewSection({ section, depth, index }: { section: CourseSection; depth: number; index: number }) {
  return (
    <div
      id={`modal-preview-${section.id}`}
      className={cn('preview-section', depth === 0 && 'mb-2 first:pt-0')}
      style={depth === 0 ? { animationDelay: `${index * 55}ms` } : undefined}
    >
      {depth === 0 ? (
        <div className="mb-5 pt-8 first:pt-0">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-brand-400/70 tabular-nums select-none">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="flex-1 h-px bg-slate-100" />
          </div>
          <h2 className="text-[20px] font-bold text-slate-900 leading-tight tracking-[-0.015em]">
            {section.title}
          </h2>
        </div>
      ) : (
        <h3 className="text-[14px] font-semibold text-slate-700 mb-3 mt-6 flex items-center gap-2">
          <span className="shrink-0 w-1 h-[14px] rounded-full bg-brand-300/70" />
          {section.title}
        </h3>
      )}

      {section.sectionType === 'learning-objectives' ? (
        <ol className="space-y-3 mb-5">
          {section.learningObjectives.map((obj, i) => (
            <li key={i} className="flex items-start gap-3 group">
              <span className="shrink-0 mt-[2px] w-[22px] h-[22px] rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shadow-brand-200/60 select-none">
                {i + 1}
              </span>
              <p className="text-[13.5px] text-slate-600 leading-[1.78] group-hover:text-slate-800 transition-colors duration-150">
                {obj}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-3 mb-4">
          {section.content.split('\n').map((para, i) =>
            para.trim() ? (
              <p key={i} className="text-[13.5px] text-slate-600 leading-[1.82] tracking-[0.008em]">
                {para}
              </p>
            ) : null,
          )}
        </div>
      )}

      {section.images && section.images.length > 0 && (
        <div className="space-y-0">
          {section.images.map((img) => (
            <SectionImageView key={img.id} image={img} />
          ))}
        </div>
      )}

      {section.hasKnowledgeCheck && (
        <div className="mt-4 flex items-center gap-3 p-3.5 bg-gradient-to-r from-brand-50/80 to-violet-50/60 border border-brand-100 rounded-2xl shadow-sm shadow-brand-100/40">
          <div className="shrink-0 w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center">
            <CheckSquare2 size={15} className="text-brand-600" />
          </div>
          <div>
            <p className="text-[11.5px] font-semibold text-brand-700 leading-tight">Knowledge Check</p>
            <p className="text-[11px] text-brand-400 mt-0.5">Practice questions follow this section</p>
          </div>
        </div>
      )}

      {depth === 0 && (
        <div className="mt-8 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="w-[3px] h-[3px] rounded-full bg-slate-200" />
          <div className="flex-1 h-px bg-slate-100" />
        </div>
      )}

      {section.children.map((child, ci) => (
        <PreviewSection key={child.id} section={child} depth={depth + 1} index={ci} />
      ))}
    </div>
  )
}

function PreviewPane({ courseContent, jobId }: { courseContent: CourseContent; jobId: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeSectionId, setActiveSectionId] = useState(courseContent.sections[0]?.id ?? '')

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function handleScroll() {
      const elRect = el!.getBoundingClientRect()
      let found = courseContent.sections[0]?.id
      for (const section of courseContent.sections) {
        const target = el!.querySelector(`#modal-preview-${section.id}`)
        if (!target) continue
        const rect = target.getBoundingClientRect()
        if (rect.top - elRect.top < elRect.height * 0.42) found = section.id
      }
      if (found) setActiveSectionId(found)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [courseContent.sections])

  const navigateToSection = useCallback((id: string) => {
    setActiveSectionId(id)
    const target = scrollRef.current?.querySelector(`#modal-preview-${id}`)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-[220px] shrink-0 flex-col overflow-hidden"
        style={{ background: 'linear-gradient(168deg, #1e1b4b 0%, #1a2240 45%, #0f172a 100%)' }}
      >
        <div className="relative px-4 pt-4 pb-3 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[24px] h-[24px] rounded-lg bg-brand-500/20 border border-brand-400/15 flex items-center justify-center shrink-0">
              <BookOpen size={10} className="text-brand-300" />
            </div>
            <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/25 select-none">
              Preview
            </span>
          </div>
          <h2 className="text-[12px] font-semibold text-white/90 leading-snug line-clamp-2 mb-3">
            {courseContent.courseTitle}
          </h2>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <Layers size={9} className="text-white/20 shrink-0" />
              <span className="text-[10px] text-white/30 font-medium">{courseContent.meta.sectionCount} sections</span>
            </div>
            <span className="w-px h-3 bg-white/[0.08]" />
            <div className="flex items-center gap-1.5">
              <Clock size={9} className="text-white/20 shrink-0" />
              <span className="text-[10px] text-white/30 font-medium">{courseContent.meta.estimatedReadTime}</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2.5 pt-3 pb-2 space-y-px overflow-y-auto">
          {courseContent.sections.map((section, i) => {
            const isActive = activeSectionId === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => navigateToSection(section.id)}
                className={cn(
                  'relative w-full text-left rounded-xl flex items-center gap-2.5 px-3 py-2.5 transition-all duration-200',
                  isActive ? 'bg-white/[0.13] text-white' : 'text-white/45 hover:bg-white/[0.06] hover:text-white/75',
                )}
              >
                <span className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-white/80 transition-all duration-300',
                  isActive ? 'h-5 opacity-100' : 'h-0 opacity-0',
                )} />
                <span className={cn(
                  'shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all duration-200',
                  isActive ? 'bg-white/[0.18] text-white' : 'bg-white/[0.06] text-white/30',
                )}>
                  {i + 1}
                </span>
                <span className="truncate text-[11.5px] font-semibold leading-tight">{section.title}</span>
              </button>
            )
          })}
        </nav>
        <div className="relative shrink-0 px-3 py-3 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={() => downloadCourseArtifact(jobId)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-semibold text-white/60 rounded-xl border border-white/[0.09] hover:bg-white/[0.09] hover:text-white/85 hover:border-white/[0.16] transition-all duration-200 active:scale-[0.98]"
          >
            <Download size={11} className="shrink-0" />
            Download DOCX
          </button>
        </div>
      </aside>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-[680px] mx-auto px-6 lg:px-10 xl:px-12">
          {courseContent.sections.map((section, i) => (
            <PreviewSection key={section.id} section={section} depth={0} index={i} />
          ))}
          <div className="h-16" />
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonLoader() {
  return (
    <div className="flex-1 max-w-3xl mx-auto space-y-4 px-6 py-6 w-full">
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

// ─── Main modal component ─────────────────────────────────────────────────────

export function CourseEditorModal({ jobId, courseSlug, onClose }: CourseEditorModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')
  const [confirmPendingEdits, setConfirmPendingEdits] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')

  const {
    courseContent,
    setCourseContent,
    updateCourseTitle,
    activeSectionId,
    sectionEditStates,
    expandedSectionIds,
    expandAll,
    collapseAll,
    resetEditor,
  } = useEditorStore()

  const { save: saveToAzure, reset: resetSaveToAzure, status: saveStatus, result: saveResult, errorMessage: saveError } = useSaveToAzure()

  const dirtySectionCount = [...sectionEditStates.values()].filter((s) => s.isDirty).length

  const { data: content, isLoading, error } = useQuery({
    queryKey: ['course-content', jobId, courseSlug ?? ''],
    queryFn: () => getCourseContent(jobId, courseSlug),
    enabled: !!jobId,
    staleTime: 5 * 60_000,
    refetchOnMount: 'always',
    retry: 2,
  })

  useEffect(() => {
    if (content) setCourseContent(content)
  }, [content, setCourseContent])

  const handleClose = useCallback(() => {
    resetEditor()
    onClose()
  }, [resetEditor, onClose])

  // Escape key closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const expandedCount = expandedSectionIds.size
  const totalSections = courseContent?.meta.sectionCount ?? 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f6f9]">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        {/* Course title + meta */}
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
                    setIsEditingTitle(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.currentTarget.blur() }
                    if (e.key === 'Escape') { setIsEditingTitle(false) }
                  }}
                  className="text-sm font-bold text-slate-900 leading-tight w-full bg-transparent border-b border-indigo-400 outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditTitleValue(courseContent.courseTitle); setIsEditingTitle(true) }}
                  className="group flex items-center gap-1.5 text-left w-full"
                  title="Click to edit course title"
                >
                  <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">
                    {courseContent.courseTitle}
                  </h1>
                  <Pencil size={11} className="shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
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

        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150',
              activeTab === 'editor'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150',
              activeTab === 'preview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            Preview
          </button>
        </div>

        {/* Action buttons (always visible, relevant to active tab) */}
        {activeTab === 'editor' && (
          <div className="flex items-center gap-2 shrink-0">
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
                    courseSlug,
                  })
                }}
                disabled={!courseContent}
                loading={saveStatus === 'loading'}
              >
                Save to Azure
              </Button>
              {confirmPendingEdits && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] max-w-xs text-left absolute top-14 right-[120px] z-10 shadow-md">
                  <p className="font-semibold text-amber-800">
                    You have {dirtySectionCount} unsaved edit{dirtySectionCount !== 1 ? 's' : ''}.
                  </p>
                  <p className="mt-0.5 text-amber-700">
                    Only saved edits will be included in the exported DOCX.
                    Click <strong>Save to Azure</strong> again to proceed.
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
        )}

        {activeTab === 'preview' && courseContent && (
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={13} />}
            onClick={() => downloadCourseArtifact(jobId)}
          >
            Download DOCX
          </Button>
        )}

        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all duration-150 active:scale-90"
        >
          <X size={13} />
        </button>
      </div>

      {/* ── Save to Azure status banners ────────────────────────────────── */}
      {saveStatus === 'loading' && (
        <div className="mx-4 mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-[12px] text-indigo-700 shrink-0">
          Uploading to Azure… large courses can take several minutes. Please keep this tab open.
        </div>
      )}
      {saveStatus === 'success' && saveResult && (
        <div className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3 shrink-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={14} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-emerald-800">Course saved to Azure</p>
            <p className="text-[11px] text-emerald-600 mt-0.5 break-all leading-relaxed">{saveResult.blobPath}</p>
          </div>
          <button type="button" onClick={resetSaveToAzure} className="shrink-0 text-emerald-400 hover:text-emerald-600">
            <X size={13} />
          </button>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3 shrink-0">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-red-700">Failed to save to Azure</p>
            <p className="text-[11px] text-red-500 mt-0.5 leading-relaxed">{saveError ?? 'An unexpected error occurred.'}</p>
          </div>
          <button type="button" onClick={resetSaveToAzure} className="shrink-0 text-red-400 hover:text-red-600">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── AI processing bar ──────────────────────────────────────────── */}
      {Array.from(sectionEditStates.values()).some((s) => s.isAIProcessing) && (
        <div className="h-[2px] bg-slate-100 shrink-0">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '100%' }} />
        </div>
      )}

      {/* ── Loading / Error states ────────────────────────────────────── */}
      {isLoading && <SkeletonLoader />}

      {!isLoading && error && (
        <div className="flex items-center justify-center flex-1 text-sm text-red-500 px-6">
          Failed to load course content. Please try closing and reopening.
        </div>
      )}

      {/* ── Tab panels (both always mounted — CSS visibility only) ────── */}
      {!isLoading && !error && courseContent && (
        <div className="flex flex-1 min-h-0">

          {/* ── EDITOR TAB ──────────────────────────────────────────────── */}
          <div
            className={cn('flex flex-1 min-h-0', activeTab !== 'editor' && 'hidden')}
            aria-hidden={activeTab !== 'editor'}
          >
            {/* Left nav */}
            <SectionNavigation
              sections={courseContent.sections}
              activeSectionId={activeSectionId}
            />

            {/* Main editor */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-6">
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
            </div>
          </div>

          {/* ── PREVIEW TAB ─────────────────────────────────────────────── */}
          <div
            className={cn('flex flex-1 min-h-0', activeTab !== 'preview' && 'hidden')}
            aria-hidden={activeTab !== 'preview'}
          >
            <PreviewPane courseContent={courseContent} jobId={jobId} />
          </div>

        </div>
      )}

      {/* Loading spinner overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10 pointer-events-none">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin text-brand-500" />
            Loading course content…
          </div>
        </div>
      )}
    </div>
  )
}
