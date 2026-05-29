import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { UploadPhase } from '../components/upload/UploadPhase'
import { ThreePanelLayout } from '../components/layout/ThreePanelLayout'
import { DocViewerPanel } from '../components/panels/DocViewerPanel'
import { TOPanel } from '../components/panels/TOPanel'
import { RulesPanel } from '../components/panels/RulesPanel'
import { DocPreviewModal } from '../components/DocPreviewModal'
import { PipelineView } from '../components/pipeline/PipelineView'
import { CourseEditorView } from '../components/editor/CourseEditorView'
import { useCourseStore } from '../store/courseStore'
import { usePipelineStore } from '../store/pipelineStore'
import { useEditorStore } from '../store/editorStore'
import { createJob } from '@/api/jobs/api'

// ─── Error helpers ────────────────────────────────────────────────────────────

/** Extract a human-readable message from any thrown error. */
function extractErrorMessage(err: unknown): string {
  // Axios error with structured detail body (e.g. FastAPI 422)
  const axiosErr = err as AxiosError<{
    detail?: string | { message?: string; error?: string; blobPath?: string }
  }>
  const detail = axiosErr?.response?.data?.detail
  if (detail) {
    if (typeof detail === 'string') return detail
    if (typeof detail === 'object') {
      return detail.message ?? detail.error ?? JSON.stringify(detail)
    }
  }
  if (err instanceof Error) return err.message
  return 'Unknown error — please try again.'
}

/** Returns true when the error indicates a source file was not found on the server. */
function isFileNotFoundError(err: unknown): boolean {
  const axiosErr = err as AxiosError<{ detail?: unknown }>
  const status = axiosErr?.response?.status
  if (status !== 404 && status !== 422) return false
  const detail = axiosErr?.response?.data?.detail
  const text = typeof detail === 'string'
    ? detail
    : typeof detail === 'object' && detail !== null
      ? JSON.stringify(detail)
      : ''
  return (
    text.toLowerCase().includes('not found') ||
    text.toLowerCase().includes('file_not_found') ||
    text.toLowerCase().includes('blobpath') ||
    text.toLowerCase().includes('re-upload')
  )
}

// ─── Generate Course Banner (three-panel phase) ───────────────────────────────
function GenerateCourseBanner() {
  const {
    phase,
    rawDocuments,
    toData,
    rulesData,
    modifiedTOPaths,
    modifiedRulesPaths,
    generatedToBlobPath,
    setPhase,
    setActiveJobId,
    updateRawDocument,
  } = useCourseStore()

  if (phase !== 'three-panel') return null

  const unsavedCount = modifiedTOPaths.size + modifiedRulesPaths.size

  const successFiles = rawDocuments.filter((f) => f.status === 'success')

  // Pre-flight: every success file must have a non-empty blobPath.
  const missingBlobFiles = successFiles.filter(
    (f) => !f.blobPath || f.blobPath.trim() === '',
  )
  const canGenerate =
    !!toData && !!rulesData && successFiles.length > 0 && missingBlobFiles.length === 0

  const studyGuideFile = successFiles[0]
  // Prefer an explicitly uploaded TO file; fall back to the LLM-generated TO
  // blob path from the generate-to preview step so A0 doesn't re-run it.
  const timedOutlineFile = successFiles[1]
  const timedOutlineBlobPath =
    timedOutlineFile?.blobPath ?? generatedToBlobPath ?? undefined

  const { mutate: startGeneration, isPending, error, reset: resetMutation } = useMutation({
    mutationFn: () =>
      createJob({
        courseTitle: (toData?.course_name as string) ?? (toData?.courseTitle as string) ?? 'Untitled Course',
        courseType: (rulesData?.ruleFamily as string) ?? (toData?.rule_family as string) ?? 'insurance_ce',
        inputs: {
          studyGuide: { blobPath: studyGuideFile?.blobPath ?? '' },
          ...(timedOutlineBlobPath
            ? { timedOutline: { blobPath: timedOutlineBlobPath } }
            : {}),
        },
        // Send the full TO JSON (including any user edits from the three-panel
        // review step). The backend injects it into shared_state so A1 uses
        // the user's reviewed outline instead of re-running A0 from scratch.
        ...(toData ? { toOverride: toData } : {}),
        // Pass all source file paths so A2 can build a chunk index for
        // topic-wise retrieval across all uploaded documents (PDFs + DOCXs).
        sourceFilePaths: successFiles
          .map((f) => f.blobPath)
          .filter((p): p is string => typeof p === 'string' && p.length > 0),
      }),
    onSuccess: (response) => {
      setActiveJobId(response.jobId)
      setPhase('pipeline')
    },
  })

  const fileNotFound = error ? isFileNotFoundError(error) : false

  function handleReupload() {
    // Mark all documents as needing re-upload so the upload phase shows them
    // as actionable (not already-success).
    for (const f of rawDocuments) {
      updateRawDocument(f.id, {
        status: 'error',
        errorMessage: 'File not found on server — please re-upload.',
      })
    }
    resetMutation()
    setPhase('upload')
  }

  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-[0_-4px_24px_-4px_rgb(0,0,0,0.08)]">
      <div className="flex items-center gap-4 px-6 py-3.5">
        {/* Status */}
        <div className="flex-1 min-w-0">
          {error ? (
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-700">
                  {fileNotFound ? 'Source files not found on server' : 'Failed to start generation'}
                </p>
                <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
                  {fileNotFound
                    ? 'One or more uploaded files are no longer available. Please re-upload your documents and try again.'
                    : extractErrorMessage(error)}
                </p>
              </div>
            </div>
          ) : missingBlobFiles.length > 0 ? (
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700">Some files are missing upload paths</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {missingBlobFiles.length} file{missingBlobFiles.length !== 1 ? 's' : ''} did not upload successfully. Go back and re-upload them.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-800">Ready to generate</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {unsavedCount > 0
                  ? `${unsavedCount} unsaved edit${unsavedCount !== 1 ? 's' : ''} — review before generating.`
                  : 'Review the Training Outline and Rules above, then click Generate Course.'}
              </p>
            </div>
          )}
        </div>

        {/* Unsaved badge */}
        {unsavedCount > 0 && !error && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 ring-1 ring-amber-200/80 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold text-amber-700">
              {unsavedCount} unsaved
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2">
          {fileNotFound && (
            <Button
              variant="secondary"
              size="md"
              icon={<RefreshCw size={13} />}
              onClick={handleReupload}
            >
              Re-upload Files
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            icon={isPending ? undefined : <Sparkles size={14} />}
            disabled={!canGenerate || isPending}
            loading={isPending}
            onClick={() => startGeneration()}
          >
            {isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Starting…
              </>
            ) : (
              'Generate Course'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Three-panel top header ───────────────────────────────────────────────────
function ThreePanelHeader() {
  const { setPhase, toData, rawDocuments } = useCourseStore()

  const courseTitle =
    (toData?.course_name as string) ?? (toData?.courseTitle as string) ?? null
  const fileCount = rawDocuments.filter((f) => f.status === 'success').length

  return (
    <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 z-10">
      <button
        type="button"
        onClick={() => setPhase('upload')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors duration-150 shrink-0"
      >
        <ArrowLeft size={15} />
        <span className="hidden sm:inline">Back</span>
      </button>

      <div className="w-px h-5 bg-slate-200 shrink-0" />

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">
          {courseTitle ?? 'Review & Generate'}
        </h1>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
          {fileCount > 0
            ? `${fileCount} file${fileCount !== 1 ? 's' : ''} ready · Review the outline and rules before generating`
            : 'Review the Training Outline and Rules before generating'}
        </p>
      </div>
    </div>
  )
}

// ─── Three-panel layout wrapper ───────────────────────────────────────────────
function ThreePanelPhase() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <ThreePanelHeader />
      <div className="flex-1 min-h-0 overflow-hidden">
        <ThreePanelLayout
          left={<DocViewerPanel />}
          middle={<TOPanel />}
          right={<RulesPanel />}
        />
      </div>
      <GenerateCourseBanner />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function CourseGenerationPage() {
  const { phase, activeJobId } = useCourseStore()
  const { clearPipeline } = usePipelineStore()
  const { resetEditor } = useEditorStore()

  function handleBackFromPipeline() {
    clearPipeline()
    useCourseStore.getState().setPhase('three-panel')
  }

  function handleBackFromEditor() {
    resetEditor()
    useCourseStore.getState().setPhase('three-panel')
  }

  // Pipeline view — requires an active job ID
  if (phase === 'pipeline') {
    if (!activeJobId) {
      handleBackFromPipeline()
      return null
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PipelineView jobId={activeJobId} />
      </div>
    )
  }

  // Course editor — requires an active job ID
  if (phase === 'course-editor') {
    if (!activeJobId) {
      handleBackFromEditor()
      return null
    }
    return <CourseEditorView jobId={activeJobId} />
  }

  return (
    <>
      {phase === 'upload' ? <UploadPhase /> : <ThreePanelPhase />}
      {/* Document preview modal — available in both pre-generation phases */}
      <DocPreviewModal />
    </>
  )
}
