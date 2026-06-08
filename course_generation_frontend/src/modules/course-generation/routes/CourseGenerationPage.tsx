import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  MessageSquarePlus,
  X,
  Pencil,
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
import { useLoadTrainingOutline } from '../hooks/useLoadTrainingOutline'

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

// ─── Special Instructions Modal ──────────────────────────────────────────────

interface SpecialInstructionsModalProps {
  onConfirm: (instructions: string) => void
  onCancel: () => void
}

function SpecialInstructionsModal({ onConfirm, onCancel }: SpecialInstructionsModalProps) {
  const [instructions, setInstructions] = useState('')

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_2px_8px_0_rgb(139,92,246,0.3)]">
              <MessageSquarePlus size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                Special Instructions
              </h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Optional — customize how the course is written
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Do you want to add any special instructions for generating this course?
          </p>
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Examples</p>
            <ul className="text-[12px] text-slate-500 space-y-0.5">
              <li>· Focus more on compliance and regulatory requirements</li>
              <li>· Include more real-world case studies and examples</li>
              <li>· Use beginner-friendly language throughout</li>
              <li>· Emphasize underwriting considerations</li>
              <li>· Add practical decision-making scenarios</li>
            </ul>
          </div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter any special instructions here (optional)…"
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(instructions)}
            className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-[0_2px_8px_0_rgb(99,102,241,0.35)] transition-all"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} />
              Generate Course
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
    audience,
    courseTitle,
    detectedRuleFamily,
    setSpecialInstructions,
    setPhase,
    setActiveJobId,
    updateRawDocument,
  } = useCourseStore()

  const [showInstructionsModal, setShowInstructionsModal] = useState(false)

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
    mutationFn: (specialInstructions?: string) =>
      createJob({
        courseTitle: courseTitle || ((toData?.course_name as string) ?? (toData?.courseTitle as string) ?? 'Untitled Course'),
        courseType: detectedRuleFamily || ((rulesData?.ruleFamily as string) ?? (toData?.rule_family as string) ?? 'insurance_ce'),
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
        audience: audience || '',
        ...(specialInstructions?.trim() ? { specialInstructions: specialInstructions.trim() } : {}),
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
            onClick={() => setShowInstructionsModal(true)}
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
      {showInstructionsModal && (
        <SpecialInstructionsModal
          onCancel={() => setShowInstructionsModal(false)}
          onConfirm={(instructions) => {
            setShowInstructionsModal(false)
            if (instructions.trim()) setSpecialInstructions(instructions)
            startGeneration(instructions.trim() || undefined)
          }}
        />
      )}
    </div>
  )
}

// ─── Three-panel top header ───────────────────────────────────────────────────

const RULE_FAMILY_LABELS: Record<string, string> = {
  insurance_ce: 'Insurance CE',
  iarce: 'IARCE',
  firm_element: 'Firm Element',
}

const RULE_FAMILY_OPTIONS = [
  { key: 'insurance_ce', label: 'Insurance CE' },
  { key: 'iarce', label: 'IARCE' },
  { key: 'firm_element', label: 'Firm Element' },
]

function ThreePanelHeader() {
  const { setPhase, rawDocuments, audience, courseTitle, setCourseTitle, detectedRuleFamily, setDetectedRuleFamily } = useCourseStore()
  const [editingTitle, setEditingTitle] = useState(false)
  const [localTitle, setLocalTitle] = useState('')
  const [showFamilyDropdown, setShowFamilyDropdown] = useState(false)

  const fileCount = rawDocuments.filter((f) => f.status === 'success').length
  const displayTitle = courseTitle || 'Review & Generate'
  const familyLabel = RULE_FAMILY_LABELS[detectedRuleFamily] ?? detectedRuleFamily

  function startEditTitle() {
    setLocalTitle(courseTitle)
    setEditingTitle(true)
  }

  function commitTitle() {
    const trimmed = localTitle.trim()
    if (trimmed) setCourseTitle(trimmed)
    setEditingTitle(false)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitTitle()
    if (e.key === 'Escape') setEditingTitle(false)
  }

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
        {editingTitle ? (
          <input
            autoFocus
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleTitleKeyDown}
            className="w-full text-sm font-bold text-slate-900 bg-white border border-indigo-400 rounded-md px-2 py-0.5 outline-none focus:ring-2 focus:ring-indigo-100"
          />
        ) : (
          <button
            type="button"
            onClick={startEditTitle}
            className="group flex items-center gap-1.5 text-left max-w-full"
            title="Click to edit course title"
          >
            <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">
              {displayTitle}
            </h1>
            <Pencil size={11} className="shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors" />
          </button>
        )}
        <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
          {fileCount > 0
            ? `${fileCount} file${fileCount !== 1 ? 's' : ''} ready`
            : 'Review the Training Outline and Rules before generating'}
          {audience.trim() && (
            <span className="ml-1.5 text-indigo-500 font-semibold">
              · Audience: {audience.trim()}
            </span>
          )}
        </p>
      </div>

      {detectedRuleFamily && (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowFamilyDropdown((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 ring-1 ring-violet-200/80 hover:bg-violet-100 transition-colors"
            title="Change rule family"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            <span className="text-xs font-semibold text-violet-700">{familyLabel}</span>
          </button>
          {showFamilyDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFamilyDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl bg-white shadow-lg ring-1 ring-slate-200 overflow-hidden">
                {RULE_FAMILY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setDetectedRuleFamily(opt.key)
                      setShowFamilyDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                      detectedRuleFamily === opt.key
                        ? 'bg-violet-50 text-violet-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.key === detectedRuleFamily && <span className="mr-1">✓</span>}
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Three-panel layout wrapper ───────────────────────────────────────────────
function ThreePanelPhase() {
  const { loading, error } = useLoadTrainingOutline()

  return (
    <div className="flex flex-col h-full min-h-0">
      <ThreePanelHeader />
      <div className="flex-1 min-h-0 overflow-hidden">
        <ThreePanelLayout
          left={<DocViewerPanel />}
          middle={<TOPanel loading={loading} loadError={error} />}
          right={<RulesPanel loading={loading} loadError={error} />}
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
