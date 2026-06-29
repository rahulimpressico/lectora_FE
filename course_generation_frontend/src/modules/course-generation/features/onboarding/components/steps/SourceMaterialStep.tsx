import type { ChangeEvent, DragEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle2, Cloud, Database, HardDrive, Loader2, RefreshCw, Upload, X, XCircle } from 'lucide-react'
import { useCourseStore } from '../../../../store/courseStore'
import { useFileUpload } from '../../../upload/hooks/useFileUpload'
import { useWizardNav } from '../WizardNavContext'
import { InlineAzureBrowser } from '../../../upload/components/InlineAzureBrowser'
import { analyzeSource } from '@/api/course-generation/api'
import { formatBytes } from '@/shared/utils/formatBytes'
import { cn } from '@/lib/cn'
import type { ImportanceLevel, IngestionStatus, SourceAnalysis, SourceRole } from '../../../../types'

/** Build a deterministic cache key from the current set of analyzable docs. */
function buildAnalysisCacheKey(docs: Array<{ blobPath: string; sourceRole?: SourceRole; importance?: ImportanceLevel; extractHint?: string }>): string {
  return JSON.stringify(
    [...docs]
      .sort((a, b) => a.blobPath.localeCompare(b.blobPath))
      .map((d) => ({
        blobPath: d.blobPath,
        sourceRole: d.sourceRole ?? 'primary_source',
        importance: d.importance ?? 'core',
        extractHint: d.extractHint ?? '',
      })),
  )
}

function IngestionBadge({ status }: { status: IngestionStatus | undefined }) {
  if (!status || status === 'indexed' || status === 'parsed') return null
  if (status === 'pending' || status === 'processing') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        Indexing…
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
        Index skipped
      </span>
    )
  }
  return null
}

function IndexedBadge({ status }: { status: IngestionStatus | undefined }) {
  if (status !== 'indexed') return null
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
      <Database className="w-2.5 h-2.5" />
      Indexed
    </span>
  )
}

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const fileCardVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 30 },
  },
  exit: { opacity: 0, x: -20, scale: 0.96, transition: { duration: 0.18, ease: [0.55, 0, 1, 0.45] as const } },
}

const hintVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.15, ease: [0.55, 0, 1, 0.45] as const } },
}

const checkmarkSpring = {
  hidden: { scale: 0, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } },
}

// ── Component ─────────────────────────────────────────────────────────────────

export const SourceMaterialStep = () => {
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const courseTopic = useCourseStore((s) => s.courseTopic)
  const setCourseTopic = useCourseStore((s) => s.setCourseTopic)
  const rawDocuments = useCourseStore((s) => s.rawDocuments)
  const removeRawDocument = useCourseStore((s) => s.removeRawDocument)
  const updateRawDocument = useCourseStore((s) => s.updateRawDocument)
  const setPhase = useCourseStore((s) => s.setPhase)
  const setSourceAnalyses = useCourseStore((s) => s.setSourceAnalyses)
  const sourceAnalysesCacheKey = useCourseStore((s) => s.sourceAnalysesCacheKey)
  const existingAnalyses = useCourseStore((s) => s.sourceAnalyses)
  const { enqueueFiles, enqueueAzureFiles } = useFileUpload()
  const [isDragging, setIsDragging] = useState(false)
  const [sourceMode, setSourceMode] = useState<'upload' | 'azure'>('upload')
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const successDocs = rawDocuments.filter((d) => d.status === 'success')
  const addedPaths = new Set(successDocs.map((d) => d.blobPath).filter(Boolean) as string[])
  const isIngesting = successDocs.some(
    (d) => d.ingestionStatus === 'pending' || d.ingestionStatus === 'processing',
  )

  const analyzableDocs = successDocs.filter(
    (d) => d.blobPath && (d.fileType === 'docx' || d.fileType === 'pdf'),
  )

  const { setConfig } = useWizardNav()

  const handleNext = () => {
    setAnalysisError(null)

    // Compute cache key only from docs that will actually be sent
    const currentCacheKey = buildAnalysisCacheKey(
      analyzableDocs
        .filter((d) => d.extractHint?.trim() || d.importance)
        .map((d) => ({
          blobPath: d.blobPath as string,
          sourceRole: d.sourceRole,
          importance: d.importance,
          extractHint: d.extractHint?.trim() || undefined,
        })),
    )

    // Cache hit: analyses already exist for these exact docs → skip API
    if (
      currentCacheKey === sourceAnalysesCacheKey &&
      existingAnalyses.length > 0
    ) {
      setPhase('wizard-objectives')
      return
    }

    // Only send docs that have at least one user-provided metadata field.
    const docsToAnalyze = analyzableDocs.filter(
      (d) => d.extractHint?.trim() || d.importance,
    )

    // Cache miss: run analyzeSource for all qualifying docs in parallel
    if (docsToAnalyze.length === 0) {
      // No docs with metadata (or no analyzable docs at all) — navigate directly
      setPhase('wizard-objectives')
      return
    }

    setIsAnalysing(true)
    Promise.allSettled(
      docsToAnalyze.map((d) =>
        analyzeSource({
          blobPath: d.blobPath as string,
          sourceRole: (d.sourceRole ?? 'primary_source') as SourceRole,
          importance: (d.importance ?? 'core') as ImportanceLevel,
          extractHint: d.extractHint?.trim() || undefined,
        }),
      ),
    )
      .then((results) => {
        const analyses: SourceAnalysis[] = results
          .filter((r): r is PromiseFulfilledResult<SourceAnalysis> => r.status === 'fulfilled')
          .map((r) => r.value)
        setSourceAnalyses(analyses, currentCacheKey)
        setPhase('wizard-objectives')
      })
      .catch(() => {
        setAnalysisError('Source analysis failed. Please try again.')
      })
      .finally(() => {
        setIsAnalysing(false)
      })
  }

  useEffect(() => {
    const isBlocked = successDocs.length === 0 || isIngesting || isAnalysing
    setConfig({
      backPhase: 'wizard-audience',
      backLabel: 'Back',
      nextLabel: isAnalysing ? 'Analysing Sources…' : isIngesting ? 'Indexing…' : 'Next: Objectives',
      isNextDisabled: isBlocked,
      isNextLoading: isIngesting || isAnalysing,
      loadingLabel: isIngesting ? 'Uploading…' : 'Analysing…',
      onNext: handleNext,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successDocs.length, isIngesting, isAnalysing])

  useEffect(() => {
    if (!courseTopic.trim() && courseTitle.trim()) {
      setCourseTopic(courseTitle)
    }
  }, [courseTitle, courseTopic, setCourseTopic])

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) void enqueueFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) void enqueueFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <motion.div
      className="space-y-5 sm:space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div className="mb-8 sm:mb-10" variants={fadeUp}>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">
          Knowledge Source <span className="text-red-400 normal-case text-[10px]">*</span>
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">
          What knowledge powers this course?
        </h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">
          Upload your reference materials. The better the materials, the
          stronger the course draft will be.
        </p>
      </motion.div>

      {/* Source mode toggle */}
      <motion.div
        className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1"
        variants={fadeUp}
        style={{ transitionDelay: "0.08s" }}
      >
        <motion.button
          type="button"
          onClick={() => setSourceMode("upload")}
          whileHover={sourceMode !== "upload" ? { opacity: 0.8 } : {}}
          whileTap={{ scale: 0.97 }}
          style={{ willChange: "transform" }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all",
            sourceMode === "upload"
              ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          <HardDrive className="w-4 h-4" />
          Upload Files
        </motion.button>
        <motion.button
          type="button"
          onClick={() => setSourceMode("azure")}
          whileHover={sourceMode !== "azure" ? { opacity: 0.8 } : {}}
          whileTap={{ scale: 0.97 }}
          style={{ willChange: "transform" }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all",
            sourceMode === "azure"
              ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          <Cloud className="w-4 h-4" />
          Select from Azure Storage
        </motion.button>
      </motion.div>

      {/* Upload / Azure mode panels */}
      <AnimatePresence mode="wait">
        {sourceMode === "upload" ? (
          <motion.div
            key="upload-panel"
            variants={fadeIn}
            initial="hidden"
            animate="show"
            exit="hidden"
          >
            <motion.div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              animate={{ scale: isDragging ? 1.01 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ willChange: "transform" }}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all",
                isDragging
                  ? "border-brand-600 bg-brand-200/20"
                  : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-100/10",
              )}
            >
              <motion.div
                className={cn(
                  "p-3 rounded-full transition-colors",
                  isDragging ? "bg-brand-100" : "bg-slate-100",
                )}
                animate={{ scale: isDragging ? 1.2 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ willChange: "transform" }}
              >
                <Upload
                  className={cn(
                    "w-6 h-6",
                    isDragging ? "text-brand-600" : "text-slate-400",
                  )}
                />
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  Drop your files here or click to browse
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Accepted: .docx, .pdf
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".docx,.pdf"
                multiple
                className="hidden"
                onChange={handleInputChange}
              />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="azure-panel"
            variants={fadeIn}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <InlineAzureBrowser
              accept={[".docx", ".pdf"]}
              onAdd={enqueueAzureFiles}
              addedPaths={addedPaths}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis error */}
      <AnimatePresence>
        {analysisError && (
          <motion.div
            key="analysis-error"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{analysisError}</span>
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mandatory hint */}
      <AnimatePresence>
        {successDocs.length === 0 && rawDocuments.length === 0 && (
          <motion.p
            key="mandatory-hint"
            variants={hintVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="text-xs font-medium text-amber-600 flex items-center gap-1.5"
          >
            <span className="w-1 h-1 rounded-full bg-amber-500 inline-block" />
            At least one source file is required to continue.
          </motion.p>
        )}
      </AnimatePresence>

      {/* File list */}
      <AnimatePresence>
        {rawDocuments.length > 0 && (
          <motion.div
            key="file-list"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="space-y-3"
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Selected files
            </p>
            <AnimatePresence mode="popLayout">
              {rawDocuments.map((file) => (
                <motion.div
                  key={file.id}
                  variants={fileCardVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  style={{ willChange: "transform" }}
                  className="bg-white border border-border rounded-xl overflow-hidden"
                >
                  {/* File header row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="shrink-0">
                      {(file.status === "uploading" || file.status === "parsing") && (
                        <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                      )}
                      {file.status === "success" && (
                        <motion.span
                          variants={checkmarkSpring}
                          initial="hidden"
                          animate="show"
                          style={{ willChange: "transform", display: "inline-flex" }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </motion.span>
                      )}
                      {file.status === "error" && <XCircle className="w-4 h-4 text-red-400" />}
                      {file.status === "idle" && (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                        <IngestionBadge status={file.ingestionStatus} />
                        <IndexedBadge status={file.ingestionStatus} />
                      </div>
                      <p className="text-xs text-slate-400">
                        {formatBytes(file.sizeBytes)}
                        {file.source === "azure" && " · Azure Storage"}
                        {file.status === "uploading" && " · Uploading..."}
                        {file.status === "parsing" && " · Parsing..."}
                        {file.status === "error" && file.errorMessage && ` · ${file.errorMessage}`}
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      onClick={() => removeRawDocument(file.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      style={{ willChange: "transform" }}
                      className="shrink-0 p-1 text-slate-400 hover:text-red-400 transition-colors rounded"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>

                  {/* Per-file metadata — only shown once uploaded */}
                  {file.status === "success" && (
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-3">
                      {/* Extract hint */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">
                          What should we extract from this source?
                        </label>
                        <textarea
                          rows={2}
                          value={file.extractHint ?? ''}
                          onChange={(e) => updateRawDocument(file.id, { extractHint: e.target.value })}
                          placeholder="e.g. Focus on regulatory definitions and compliance obligations"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 transition-all resize-none"
                        />
                      </div>

                      {/* Importance */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600">
                          How important is this source?
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {([
                            { value: 'core',           label: 'Core',                 active: 'bg-indigo-600 text-white border-indigo-600' },
                            { value: 'supporting',     label: 'Supporting',           active: 'bg-sky-500 text-white border-sky-500' },
                            { value: 'reference_only', label: 'Reference Only',       active: 'bg-amber-500 text-white border-amber-500' },
                            { value: 'ignore',         label: 'Ignore unless needed', active: 'bg-slate-400 text-white border-slate-400' },
                          ] as const).map(({ value, label, active }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => updateRawDocument(file.id, { importance: file.importance === value ? undefined : value })}
                              className={cn(
                                'px-3 py-1 text-xs rounded-full border font-medium transition-colors',
                                file.importance === value
                                  ? active
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
