import { useMutation } from '@tanstack/react-query'
import { Sparkles, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { useCourseStore } from '../../onboarding-flow/store'
import { submitCourseRun } from '@/api/course-run/api'
import { buildCourseRunSubmission } from '../utils/buildCourseRunPayload'
import { extractErrorMessage, isFileNotFoundError } from '../../../utils/jobErrorUtils'

export const GenerateCourseBanner = () => {
  const {
    phase,
    rawDocuments,
    modifiedTOPaths,
    modifiedRulesPaths,
    generatedToBlobPath,
    toDocument,
    audience,
    durationHours,
    difficultyLevel,
    wizardData,
    rulesData,
    updatedRulesData,
    courseId,
    toData,
    updatedToData,
    setPhase,
    setActiveJobId,
    updateRawDocument,
  } = useCourseStore()

  if (phase !== 'three-panel') return null

  const unsavedCount = modifiedTOPaths.size + modifiedRulesPaths.size
  const successFiles = rawDocuments.filter((f) => f.status === 'success')

  const missingBlobFiles = successFiles.filter((f) => !f.blobPath || f.blobPath.trim() === '')
  const canGenerate = !!courseId && successFiles.length > 0 && missingBlobFiles.length === 0

  const {
    mutate: startGeneration,
    isPending,
    isSuccess,
    error,
    reset: resetMutation,
  } = useMutation({
    mutationFn: async () => {
      const submission = buildCourseRunSubmission({
        courseId,
        rawDocuments,
        toDocument,
        generatedToBlobPath,
        audience,
        durationHours,
        difficultyLevel,
        wizardData,
        rulesData,
        updatedRulesData,
        modifiedRulesPaths,
        toData,
        updatedToData,
      })
      return submitCourseRun(submission)
    },
    onSuccess: ({ jobId }) => {
      setActiveJobId(jobId)
      setPhase('pipeline')
    },
  })

  const fileNotFound = error ? isFileNotFoundError(error) : false

  const handleReupload = () => {
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
                  {missingBlobFiles.length} file{missingBlobFiles.length !== 1 ? 's' : ''} did not upload
                  successfully. Go back and re-upload them.
                </p>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">Course run saved</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Inputs, spec, and rule overrides were persisted for this course run.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-800">Ready to generate</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {unsavedCount > 0
                  ? `${unsavedCount} unsaved edit${unsavedCount !== 1 ? 's' : ''} — review before generating.`
                  : 'Review the course structure and Rules above, then click Generate Course.'}
              </p>
            </div>
          )}
        </div>

        {/* Unsaved badge */}
        {unsavedCount > 0 && !error && !isSuccess && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 ring-1 ring-amber-200/80 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold text-amber-700">{unsavedCount} unsaved</span>
          </div>
        )}

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2">
          {fileNotFound && (
            <Button variant="secondary" size="md" icon={<RefreshCw size={13} />} onClick={handleReupload}>
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
                Saving…
              </>
            ) : isSuccess ? (
              'Regenerate Course Run'
            ) : (
              'Generate Course'
            )}
          </Button>
        </div>
      </div>

    </div>
  )
}
