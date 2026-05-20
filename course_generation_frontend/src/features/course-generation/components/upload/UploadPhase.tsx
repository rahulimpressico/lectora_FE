import { Wand2, Files, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/shared/components/Button'
import { UploadZone } from '../UploadZone'
import { FileCard } from '../FileCard'
import { useCourseStore } from '../../store/courseStore'
import { useFileUpload } from '../../hooks/useFileUpload'
import { useGenerateTO } from '../../hooks/useGenerateTO'
import { TOGenerationLoader } from './TOGenerationLoader'

const STEPS = ['Upload', 'Review & Edit', 'Generate']

export function UploadPhase() {
  const {
    rawDocuments,
    removeRawDocument,
    openPreview,
    courseTopic,
    setCourseTopic,
    uploadFolder,
  } = useCourseStore()
  const { enqueueFiles, isTopicValid } = useFileUpload('raw')
  const generateTO = useGenerateTO()

  const topicLocked = rawDocuments.length > 0
  const topicError =
    courseTopic.trim().length > 0 && !isTopicValid
      ? 'Enter at least 2 characters with a letter or number'
      : null

  const successFiles   = rawDocuments.filter((f) => f.status === 'success')
  const processingFiles = rawDocuments.filter(
    (f) => f.status === 'parsing' || f.status === 'uploading',
  )
  const errorFiles = rawDocuments.filter((f) => f.status === 'error')

  const canGenerate = successFiles.length > 0 && processingFiles.length === 0

  return (
    <div className="relative flex flex-col h-full">
      {generateTO.isPending && <TOGenerationLoader />}
      {/* Scrollable area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-10 space-y-6">

          {/* Page header */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_3px_12px_0_rgb(99,102,241,0.4)]">
                <Upload size={17} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Upload Source Documents
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Step 1 of 3 — Provide your study guide DOCX files
                </p>
              </div>
            </div>

            {/* Step progress */}
            <div className="flex gap-2">
              {STEPS.map((label, i) => (
                <div key={label} className="flex-1">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-500',
                      i === 0
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                        : 'bg-slate-200',
                    )}
                  />
                  <div className="mt-1.5 flex items-center gap-1">
                    {i === 0 ? (
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    )}
                    <p
                      className={cn(
                        'text-[11px] font-semibold',
                        i === 0 ? 'text-indigo-600' : 'text-slate-400',
                      )}
                    >
                      {label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_4px_0_rgb(0,0,0,0.05),0_4px_12px_0_rgb(0,0,0,0.03)] overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/40 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-800">Source Documents</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Upload one or more DOCX files. The first file will be used as the primary study guide.
              </p>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="course-topic"
                  className="block text-xs font-bold uppercase tracking-widest text-slate-500"
                >
                  Course topic <span className="text-red-500">*</span>
                </label>
                <input
                  id="course-topic"
                  type="text"
                  value={courseTopic}
                  onChange={(e) => setCourseTopic(e.target.value)}
                  disabled={topicLocked}
                  placeholder="e.g. Enhanced Flood Insurance"
                  className={cn(
                    'w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 outline-none transition-shadow',
                    'placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300',
                    topicLocked && 'bg-slate-50 text-slate-500 cursor-not-allowed',
                    topicError ? 'border-red-300' : 'border-slate-200',
                  )}
                />
                <p className="text-xs text-slate-500">
                  {topicLocked && uploadFolder ? (
                    <>
                      Files are stored in Azure under{' '}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-indigo-700">
                        uploaded-documents/{uploadFolder}/
                      </code>
                    </>
                  ) : (
                    'This name creates your folder in blob storage (uploaded-documents/your_topic/). Required before upload.'
                  )}
                </p>
                {topicError && (
                  <p className="text-xs text-red-600 font-medium">{topicError}</p>
                )}
              </div>

              <UploadZone
                onFiles={enqueueFiles}
                multiple
                disabled={!isTopicValid}
                label={
                  isTopicValid
                    ? 'Drop DOCX files here'
                    : 'Enter course topic first'
                }
                sublabel="or click to browse your computer"
              />

              {rawDocuments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Files size={13} className="text-slate-400" />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        {rawDocuments.length} file{rawDocuments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {successFiles.length > 0 && (
                      <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 ring-1 ring-emerald-200">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        <span className="text-[11px] font-semibold text-emerald-700">
                          {successFiles.length} ready
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {rawDocuments.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        onRemove={removeRawDocument}
                        onPreview={openPreview}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error summary — failed files */}
          {errorFiles.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/70 px-4 py-3.5">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  {errorFiles.length} file{errorFiles.length !== 1 ? 's' : ''} failed to upload
                </p>
                <p className="text-xs text-red-500 mt-0.5">
                  Remove the failed files and re-upload them to continue.
                </p>
              </div>
            </div>
          )}

          {/* Error summary — mutation */}
          {generateTO.isError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/70 px-4 py-3.5">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Failed to generate Training Outline</p>
                <p className="text-xs text-red-500 mt-0.5">
                  {generateTO.error instanceof Error
                    ? generateTO.error.message
                    : 'An unexpected error occurred. Please try again.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div
        className={cn(
          'border-t border-slate-200/80 bg-white/95 backdrop-blur-sm transition-all duration-300',
          canGenerate || generateTO.isPending
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none',
        )}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-6 px-8 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {processingFiles.length > 0
                ? `Processing ${processingFiles.length} file…`
                : `${successFiles.length} file${successFiles.length !== 1 ? 's' : ''} ready`}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Click "Generate TO" to extract the training outline from your documents.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            icon={<Wand2 size={16} />}
            loading={generateTO.isPending}
            disabled={!canGenerate || generateTO.isPending}
            onClick={() => {
              if (!generateTO.isPending) generateTO.mutate()
            }}
          >
            {generateTO.isPending ? 'Generating TO…' : 'Generate TO'}
          </Button>
        </div>
      </div>
    </div>
  )
}
