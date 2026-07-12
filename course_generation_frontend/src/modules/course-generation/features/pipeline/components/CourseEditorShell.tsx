/**
 * CourseEditorShell
 *
 * Shared layout frame for the course editor: top bar (title, metadata, action
 * buttons), Azure status banners, AI-processing indicator, left section
 * navigation, and a scrollable content area.  Used by both CourseEditorView
 * (inline pipeline view) and CourseEditorModal (Asset Library overlay).
 *
 * Unique elements like DnD wrappers, tabs, and confirm-leave dialogs stay in
 * the consumer; they are composed via the `children` and slot props below.
 */

import type { ReactNode } from 'react'
import {
  Download,
  Loader2,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Hash,
  Clock,
  Pencil,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/components/Button'
import { SectionNavigation } from './SectionNavigation'
import { useEditorStore } from '../../../store/editorStore'
import type { useCourseEditorSession } from '../hooks/useCourseEditorSession'

type Session = ReturnType<typeof useCourseEditorSession>

export interface CourseEditorShellProps {
  session: Session
  /** Slot: rendered at the far left of the topbar (e.g. Back or Close button). */
  topBarLeading?: ReactNode
  /** Slot: rendered between the title and the action buttons (e.g. tab switcher). */
  topBarCenter?: ReactNode
  /** Slot: rendered after the Download button (e.g. a separate Close icon). */
  topBarTrailing?: ReactNode
  /** Additional action buttons inserted before Save to Azure / Download. */
  extraActions?: ReactNode
  /** Hide the Save to Azure button (e.g. on the Preview tab of CourseEditorModal). */
  showAzureSave?: boolean
  /** Called after the shell saves the edited title (e.g. to sync courseStore). */
  onTitleSave?: (title: string) => void
  /**
   * `'editor'` (default): shell renders SectionNavigation + expand/collapse
   * toolbar + max-w-4xl content wrapper. Pass section cards as children.
   *
   * `'raw'`: shell renders children directly in `flex-1 flex min-h-0`. Use
   * when the consumer owns the full content layout (e.g. two-tab modals).
   */
  contentMode?: 'editor' | 'raw'
  children: ReactNode
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

export function CourseEditorShell({
  session,
  topBarLeading,
  topBarCenter,
  topBarTrailing,
  extraActions,
  showAzureSave = true,
  onTitleSave,
  contentMode = 'editor',
  children,
}: CourseEditorShellProps) {
  const {
    isDownloading,
    downloadError,
    hasUnsavedChanges,
    saveStatus,
    saveResult,
    saveError,
    handleDownload,
    handleSaveToAzure,
    resetSaveToAzure,
    draftChecked,
    isLoading,
  } = session

  const courseContent = useEditorStore((s) => s.courseContent)
  const activeSectionId = useEditorStore((s) => s.activeSectionId)
  const expandedSectionIds = useEditorStore((s) => s.expandedSectionIds)
  const sectionEditStates = useEditorStore((s) => s.sectionEditStates)
  const expandAll = useEditorStore((s) => s.expandAll)
  const collapseAll = useEditorStore((s) => s.collapseAll)
  const updateCourseTitle = useEditorStore((s) => s.updateCourseTitle)

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')

  const showSkeleton = !courseContent && (isLoading || !draftChecked)
  const dirtySectionCount = [...sectionEditStates.values()].filter((s) => s.isDirty).length
  const expandedCount = expandedSectionIds.size
  const totalSections = courseContent?.meta.sectionCount ?? 0

  function commitTitle(raw: string) {
    const t = raw.trim() || courseContent!.courseTitle
    updateCourseTitle(t)
    onTitleSave?.(t)
    setIsEditingTitle(false)
  }

  return (
    <>
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        {topBarLeading && (
          <>
            {topBarLeading}
            <div className="w-px h-5 bg-slate-200 shrink-0" />
          </>
        )}

        {/* Course title + metadata */}
        <div className="flex-1 min-w-0">
          {courseContent ? (
            <>
              {isEditingTitle ? (
                <input
                  autoFocus
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  onBlur={() => commitTitle(editTitleValue)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setIsEditingTitle(false)
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

        {topBarCenter}

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {extraActions}

          {showAzureSave && (
            <Button
              variant="secondary"
              size="sm"
              icon={<CloudUpload size={13} />}
              onClick={() => { void handleSaveToAzure() }}
              disabled={!courseContent || !hasUnsavedChanges || saveStatus === 'loading'}
              loading={saveStatus === 'loading'}
              title={
                hasUnsavedChanges
                  ? 'Save current course to Azure'
                  : 'No changes to save'
              }
            >
              {saveStatus === 'loading' ? 'Saving…' : 'Save to Azure'}
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            onClick={() => { void handleDownload() }}
            disabled={!courseContent || isDownloading}
          >
            {isDownloading ? 'Downloading…' : 'Download DOCX'}
          </Button>
        </div>

        {topBarTrailing}
      </div>

      {downloadError && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3 shrink-0">
          <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-700">{downloadError}</p>
        </div>
      )}

      {/* ── Azure status banners ───────────────────────────────────────────── */}
      {saveStatus === 'loading' && (
        <div className="mx-4 mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-[12px] text-indigo-700 shrink-0">
          Saving to Azure… large courses can take several minutes. Please keep this tab open.
        </div>
      )}
      {saveStatus === 'success' && saveResult && (
        <div className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3 shrink-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={14} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-emerald-800">Course saved to Azure</p>
            {saveResult.versionNumber != null && (
              <p className="text-[11px] text-emerald-600 mt-0.5">
                Version {saveResult.versionNumber}
              </p>
            )}
            <p className="text-[11px] text-emerald-600 mt-0.5 break-all leading-relaxed">{saveResult.blobPath}</p>
            {saveResult.savedAt && (
              <p className="text-[11px] text-emerald-500 mt-0.5">
                Saved {new Date(saveResult.savedAt).toLocaleString()}
              </p>
            )}
          </div>
          <button type="button" onClick={resetSaveToAzure} className="shrink-0 text-emerald-400 hover:text-emerald-600 transition-colors">
            <X size={13} />
          </button>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3 shrink-0">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-red-700">Failed to save to Azure</p>
            <p className="text-[11px] text-red-500 mt-0.5 leading-relaxed">
              {saveError ?? 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
          <button type="button" onClick={resetSaveToAzure} className="shrink-0 text-red-400 hover:text-red-600 transition-colors">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── AI processing indicator ────────────────────────────────────────── */}
      {Array.from(sectionEditStates.values()).some((s) => s.isAIProcessing) && (
        <div className="h-[2px] bg-slate-100 shrink-0">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '100%' }} />
        </div>
      )}

      {/* ── Content area ───────────────────────────────────────────────────── */}
      {contentMode === 'raw' ? (
        // Consumer owns the full layout (e.g. a two-tab modal with its own
        // SectionNavigation and PreviewPane per tab).
        <div className="flex-1 flex min-h-0">{children}</div>
      ) : (
        // Default 'editor' mode: SectionNavigation sidebar + scrollable editor
        // area with expand/collapse toolbar and max-w content wrapper.
        <div className="flex-1 flex min-h-0">
          {courseContent && (
            <SectionNavigation sections={courseContent.sections} activeSectionId={activeSectionId} />
          )}
          <div className="flex-1 overflow-y-auto">
            {showSkeleton ? (
              <SkeletonLoader />
            ) : courseContent ? (
              <div className="max-w-4xl mx-auto px-6 py-6">
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
                    <button type="button" onClick={expandAll} className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition-colors">
                      <ChevronDown size={11} /> Expand all
                    </button>
                    <span className="text-slate-300 text-xs">·</span>
                    <button type="button" onClick={collapseAll} className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition-colors">
                      <ChevronRight size={11} /> Collapse all
                    </button>
                  </div>
                </div>
                {children}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}
