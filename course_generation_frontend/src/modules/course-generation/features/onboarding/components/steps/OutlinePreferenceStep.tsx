import type { ChangeEvent, DragEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, Sparkles, Upload, Wand2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCourseStore } from '../../../../store/courseStore'
import { useGenerateTO } from '../../../upload/hooks/useGenerateTO'
import { useFileUpload } from '../../../upload/hooks/useFileUpload'
import { useWizardNav } from '../WizardNavContext'
import { AIGenerationLoader } from '../AIGenerationLoader'
import { formatBytes } from '@/utils/formatBytes'
import { cn } from '@/lib/cn'
import type { WizardData } from '../../../../types/wizard'
import { suggestOutlineStructure } from '@/api/course-generation/api'

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const slideUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: [0.55, 0, 1, 0.45] as const } },
}

const fileItemVariant = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, x: 12, transition: { duration: 0.2, ease: [0.55, 0, 1, 0.45] as const } },
}

// ---------------------------------------------------------------------------

function buildCompositePrompt(data: WizardData, audience: string): string {
  const parts: string[] = []

  if (data.description) parts.push(`Course description: ${data.description}`)
  if (audience) parts.push(`Target audience: ${audience}`)
  if (data.audienceNotes) parts.push(`Audience notes: ${data.audienceNotes}`)
  if (data.experienceLevel) parts.push(`Learner experience level: ${data.experienceLevel}`)
  if (data.learnerOutcomes) parts.push(`Learner outcomes: ${data.learnerOutcomes}`)
  if (data.objectives.length > 0) {
    parts.push(`Learning objectives:\n${data.objectives.map((o) => `- ${o}`).join('\n')}`)
  }
  if (data.tone) parts.push(`Desired tone: ${data.tone}`)
  if (data.depth) parts.push(`Course depth: ${data.depth}`)
  if (data.emphasis) parts.push(`Emphasize: ${data.emphasis}`)
  if (data.avoid) parts.push(`Avoid: ${data.avoid}`)
  if (!data.includeScenarios) parts.push('Do not include scenarios or examples.')
  if (!data.includeKnowledgeChecks) parts.push('Do not include knowledge checks.')
  if (data.sourceNotes) parts.push(`Source notes: ${data.sourceNotes}`)
  if (data.lessonStyle === 'short') parts.push('Lesson style: short, focused sections.')
  if (data.lessonStyle === 'detailed') parts.push('Lesson style: detailed, comprehensive chapters.')
  if (data.preferredChapters) parts.push(`Preferred number of chapters: ${data.preferredChapters}`)

  return parts.join('\n\n')
}

export const OutlinePreferenceStep = () => {
  const setCustomToPrompt = useCourseStore((s) => s.setCustomToPrompt)
  const audience = useCourseStore((s) => s.audience)
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const courseTypeHint = useCourseStore((s) => s.courseTypeHint)

  const rawDocuments = useCourseStore((s) => s.rawDocuments)
  const removeRawDocument = useCourseStore((s) => s.removeRawDocument)
  const { enqueueFiles } = useFileUpload()
  const generateTO = useGenerateTO('wizard-outline-review')

  const outlineMode = wizardData.outlineMode ?? 'generate'
  const preferredChapters = wizardData.preferredChapters
  const lessonStyle = wizardData.lessonStyle

  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Snapshot the IDs already in the store when this step mounts so we can
  // distinguish outline files uploaded here from source files added in step 3.
  const priorDocIds = useRef<Set<string>>(new Set(rawDocuments.map((f) => f.id)))
  const outlineFiles = rawDocuments.filter((f) => !priorDocIds.current.has(f.id))

  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestReasoning, setSuggestReasoning] = useState<string | null>(null)
  const [suggestError, setSuggestError] = useState<string | null>(null)

  const { setConfig } = useWizardNav()

  useEffect(() => {
    if (outlineMode === 'generate') {
      setConfig({
        backPhase: 'wizard-direction',
        backLabel: 'Back',
        nextLabel: generateTO.isPending ? 'Generating...' : 'Generate Outline',
        isNextLoading: generateTO.isPending,
        isNextDisabled: generateTO.isPending,
        onNext: () => {
          if (!generateTO.isPending) {
            // Build the composite prompt from the latest wizard state so the
            // closure is never stale — wizardData and audience are in deps.
            const composite = buildCompositePrompt(wizardData, audience)
            setCustomToPrompt(composite)
            generateTO.mutate()
          }
        },
      })
    } else {
      const hasOutlineFile = outlineFiles.some((f) => f.status === 'success')
      setConfig({
        backPhase: 'wizard-direction',
        backLabel: 'Back',
        nextPhase: 'wizard-outline-review',
        nextLabel: 'Review Outline',
        isNextDisabled: !hasOutlineFile,
      })
    }
  }, [outlineMode, generateTO.isPending, outlineFiles, wizardData, audience, setConfig, setCustomToPrompt, generateTO])

  const handleSuggestStructure = () => {
    setIsSuggesting(true)
    setSuggestReasoning(null)
    setSuggestError(null)

    suggestOutlineStructure({
      courseTitle: courseTitle || undefined,
      courseDescription: wizardData.description || undefined,
      courseType: courseTypeHint || undefined,
      targetAudience: audience || undefined,
      skillLevel: wizardData.experienceLevel || undefined,
      learningObjectives: wizardData.objectives.length > 0 ? wizardData.objectives : undefined,
    })
      .then((result) => {
        setWizardData({
          preferredChapters: String(result.preferredChapters),
          lessonStyle: result.lessonStyle as 'short' | 'detailed',
        })
        setSuggestReasoning(result.reasoning || null)
      })
      .catch((err: unknown) => {
        setSuggestError(err instanceof Error ? err.message : 'Failed to suggest structure.')
      })
      .finally(() => {
        setIsSuggesting(false)
      })
  }

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
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Outline Structure</p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">How would you like to structure this?</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">Upload your own course outline, or let the AI build one from your materials and settings.</p>
      </motion.div>

      {/* Option cards */}
      <motion.div className="space-y-3" variants={fadeUp}>
        {/* Upload */}
        <motion.button
          type="button"
          onClick={() => setWizardData({ outlineMode: 'upload' })}
          style={{ willChange: 'transform' }}
          whileHover={{ y: -3, scale: 1.01, boxShadow: '0 8px 24px rgba(99,102,241,0.08)' }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'w-full flex items-start gap-4 p-5 rounded-xl cursor-pointer transition-colors text-left',
            outlineMode === 'upload'
              ? 'border-2 border-indigo-500 bg-indigo-50/60'
              : 'border border-slate-200/80 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50/20',
          )}
        >
          <div
            className={cn(
              'p-2.5 rounded-lg shrink-0',
              outlineMode === 'upload' ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
            )}
          >
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Yes, I have an outline</p>
            <p className="text-xs text-slate-500 mt-0.5">Upload your existing course structure</p>
          </div>
        </motion.button>

        {/* Generate */}
        <motion.button
          type="button"
          onClick={() => setWizardData({ outlineMode: 'generate' })}
          style={{ willChange: 'transform' }}
          whileHover={{ y: -3, scale: 1.01, boxShadow: '0 8px 24px rgba(99,102,241,0.08)' }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'w-full flex items-start gap-4 p-5 rounded-xl cursor-pointer transition-colors text-left',
            outlineMode === 'generate'
              ? 'border-2 border-indigo-500 bg-indigo-50/60'
              : 'border border-slate-200/80 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50/20',
          )}
        >
          <div
            className={cn(
              'p-2.5 rounded-lg shrink-0',
              outlineMode === 'generate' ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
            )}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">No, create one for me</p>
            <p className="text-xs text-slate-500 mt-0.5">Let the AI build a structured outline from your materials</p>
          </div>
        </motion.button>
      </motion.div>

      {/* Mode-specific sub-sections — animated on switch */}
      <AnimatePresence mode="wait">
        {outlineMode === 'generate' && (
          <motion.div
            key="generate-mode"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
            style={{ willChange: 'transform' }}
          >
            {/* AI structure suggest button + reasoning chip */}
            <div className="flex flex-col gap-2">
              <motion.button
                type="button"
                onClick={handleSuggestStructure}
                disabled={isSuggesting}
                style={{ willChange: 'transform' }}
                whileHover={{ scale: 1.02, backgroundColor: 'rgb(224,231,255)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="flex items-center gap-2 self-start px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSuggesting ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      style={{ display: 'inline-flex' }}
                    >
                      <Loader2 className="w-4 h-4" />
                    </motion.span>
                    Analysing your course…
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Suggest Structure for Me
                  </>
                )}
              </motion.button>

              {/* Reasoning chip */}
              <AnimatePresence>
                {suggestReasoning && (
                  <motion.p
                    key="reasoning"
                    variants={slideUp}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="text-xs text-slate-500 italic pl-1"
                  >
                    💡 {suggestReasoning}
                  </motion.p>
                )}
              </AnimatePresence>

              {suggestError && (
                <p className="text-xs text-red-500 pl-1">{suggestError}</p>
              )}
            </div>

            {/* Chapter number input + lesson style — staggered in */}
            <motion.div
              className="space-y-5"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {/* Preferred chapters */}
              <motion.div className="space-y-1.5" variants={fadeUp}>
                <label className="block text-sm font-medium text-slate-700">
                  Preferred Number of Chapters
                  <span className="text-slate-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={preferredChapters}
                  onChange={(e) => {
                    setWizardData({ preferredChapters: e.target.value })
                    setSuggestReasoning(null)
                  }}
                  placeholder="e.g. 6"
                  className="w-40 px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                />
              </motion.div>

              {/* Lesson style */}
              <motion.div className="space-y-1.5" variants={fadeUp}>
                <label className="block text-sm font-medium text-slate-700">Lesson Style</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    onClick={() => {
                      setWizardData({ lessonStyle: 'short' })
                      setSuggestReasoning(null)
                    }}
                    style={{ willChange: 'transform' }}
                    whileHover={{ y: -3, scale: 1.01, boxShadow: '0 8px 24px rgba(99,102,241,0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex flex-col items-start gap-1 p-4 rounded-xl cursor-pointer transition-colors text-left',
                      lessonStyle === 'short'
                        ? 'border-2 border-indigo-500 bg-indigo-50/60 shadow-sm'
                        : 'border border-slate-200/80 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50/20',
                    )}
                  >
                    <p className="text-sm font-semibold text-slate-800">Short Sections</p>
                    <p className="text-xs text-slate-500">Compact, focused</p>
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setWizardData({ lessonStyle: 'detailed' })
                      setSuggestReasoning(null)
                    }}
                    style={{ willChange: 'transform' }}
                    whileHover={{ y: -3, scale: 1.01, boxShadow: '0 8px 24px rgba(99,102,241,0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex flex-col items-start gap-1 p-4 rounded-xl cursor-pointer transition-colors text-left',
                      lessonStyle === 'detailed'
                        ? 'border-2 border-indigo-500 bg-indigo-50/60 shadow-sm'
                        : 'border border-slate-200/80 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50/20',
                    )}
                  >
                    <p className="text-sm font-semibold text-slate-800">Detailed Chapters</p>
                    <p className="text-xs text-slate-500">Comprehensive, in-depth</p>
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>

            {/* Generate info card */}
            <motion.div
              className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3"
              variants={fadeIn}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <p className="text-sm font-semibold text-slate-800">Ready to create your timed outline?</p>
              </div>
              <p className="text-xs text-slate-500">
                The assistant will analyze your source materials and build a structured course outline based on all the details you've provided.
              </p>

              {generateTO.isError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{generateTO.error?.message ?? 'An error occurred. Please try again.'}</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {outlineMode === 'upload' && (
          <motion.div
            key="upload-mode"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3"
            style={{ willChange: 'transform' }}
          >
            {/* Dropzone */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="show"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              style={{ willChange: 'transform' }}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all',
                isDragging
                  ? 'border-brand-600 bg-brand-200/20'
                  : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-100/10',
              )}
            >
              <Upload className="w-6 h-6 text-slate-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">Drop your outline file here or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">Accepted: .docx, .pdf, .json</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".docx,.pdf,.json"
                className="hidden"
                onChange={handleInputChange}
              />
            </motion.div>

            {/* File list — only files uploaded in this step */}
            {outlineFiles.length > 0 && (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {outlineFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      variants={fileItemVariant}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      layout
                      style={{ willChange: 'transform' }}
                      className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">{formatBytes(file.sizeBytes)}</p>
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => removeRawDocument(file.id)}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="shrink-0 p-1 text-slate-400 hover:text-red-400 transition-colors rounded"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen AI loader — portal to document.body, shown while generation runs */}
      {generateTO.isPending && (
        <AIGenerationLoader
          onCancel={generateTO.cancel}
          statusMessage={generateTO.statusMessage}
        />
      )}
    </motion.div>
  )
}
