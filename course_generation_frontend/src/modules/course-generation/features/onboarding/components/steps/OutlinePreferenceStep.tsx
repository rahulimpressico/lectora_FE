import type { ChangeEvent, DragEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, ClipboardList, ClipboardPaste, Loader2, RefreshCw, Sparkles, Upload, Wand2, X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Document, Packer, Paragraph } from 'docx'
import { motion, AnimatePresence } from 'framer-motion'
import { useCourseStore } from '../../../../store/courseStore'
import { useGenerateTO } from '../../../upload/hooks/useGenerateTO'
import { useWizardNav } from '../WizardNavContext'
import { AIGenerationLoader } from '../AIGenerationLoader'
import { formatBytes } from '@/shared/utils/formatBytes'
import { cn } from '@/lib/cn'
import type { WizardData } from '../../../../types/wizard'
import { suggestOutlineStructure, uploadDocument } from '@/api/course-generation/api'

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
  const includeCaseStudies = data.includeCaseStudies ?? data.includeScenarios ?? true
  const includeExamples = data.includeExamples ?? data.includeScenarios ?? true

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
  if (!includeCaseStudies && !includeExamples) parts.push('Do not include case studies or examples.')
  else {
    if (!includeCaseStudies) parts.push('Do not include case studies.')
    if (!includeExamples) parts.push('Do not include examples.')
  }
  if (!data.includeKnowledgeChecks) parts.push('Do not include knowledge checks.')
  if (data.sourceNotes) parts.push(`Source notes: ${data.sourceNotes}`)
  if (data.lessonStyle === 'short') parts.push('Lesson style: short, focused sections.')
  if (data.lessonStyle === 'detailed') parts.push('Lesson style: detailed, comprehensive chapters.')
  if (data.preferredChapters) parts.push(`Preferred number of chapters: ${data.preferredChapters}`)

  return parts.join('\n\n')
}

function buildCompositePromptWithOutline(
  data: WizardData,
  audience: string,
  outlineText?: string,
): string {
  const base = buildCompositePrompt(data, audience)
  const trimmedOutline = outlineText?.trim()
  if (!trimmedOutline) return base

  const outlineSection = `User-provided outline structure:\n${trimmedOutline}`
  return base ? `${base}\n\n${outlineSection}` : outlineSection
}

export const OutlinePreferenceStep = () => {
  const setCustomToPrompt = useCourseStore((s) => s.setCustomToPrompt)
  const setToDocument = useCourseStore((s) => s.setToDocument)
  const setUploadFolder = useCourseStore((s) => s.setUploadFolder)
  const audience = useCourseStore((s) => s.audience)
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const courseTypeHint = useCourseStore((s) => s.courseTypeHint)
  const toData = useCourseStore((s) => s.toData)
  const outlineStaleFromLo = useCourseStore((s) => s.outlineStaleFromLo)
  const outlineStaleFromPaste = useCourseStore((s) => s.outlineStaleFromPaste)
  const markOutlineStaleFromPasteChange = useCourseStore((s) => s.markOutlineStaleFromPasteChange)
  const toDocument = useCourseStore((s) => s.toDocument)
  const courseTopic = useCourseStore((s) => s.courseTopic)
  const setPhase = useCourseStore((s) => s.setPhase)
  const generateTO = useGenerateTO('wizard-outline-review')

  const hasExistingTO = toData != null && !outlineStaleFromLo && !outlineStaleFromPaste

  const outlineMode = wizardData.outlineMode ?? 'generate'
  const outlinePasteText = wizardData.outlinePasteText ?? ''
  const hasOwnOutline = outlineMode === 'upload' || outlineMode === 'paste'
  const hasPastedOutline = outlineMode === 'paste' && outlinePasteText.trim().length > 0
  const pasteOutlineNeedsRegen = hasPastedOutline && outlineStaleFromPaste
  const preferredChapters = wizardData.preferredChapters
  const lessonStyle = wizardData.lessonStyle

  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [outlineUploadError, setOutlineUploadError] = useState<string | null>(null)
  const hasOutlineFile = toDocument?.status === 'success'

  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestReasoning, setSuggestReasoning] = useState<string | null>(null)
  const [suggestError, setSuggestError] = useState<string | null>(null)

  const { setConfig } = useWizardNav()
  const latestWizardDataRef = useRef(wizardData)
  const latestAudienceRef = useRef(audience)
  const latestOutlinePasteTextRef = useRef(outlinePasteText)
  const generateTORef = useRef(generateTO)

  const { mutateAsync: uploadOutlineFile, isPending: isUploadingOutline } = useMutation({
    mutationFn: async (file: File) => {
      const { blobPath, uploadFolder } = await uploadDocument(file, courseTopic.trim())
      return { blobPath, uploadFolder, file }
    },
    onSuccess: ({ blobPath, uploadFolder, file }) => {
      setUploadFolder(uploadFolder)
      const lower = file.name.toLowerCase()
      setOutlineUploadError(null)
      setWizardData({ outlinePasteText: '', outlineMode: 'upload' })
      setToDocument({
        id: 'wizard-outline-doc',
        file,
        name: file.name,
        sizeBytes: file.size,
        status: 'success',
        fileType: lower.endsWith('.pdf') ? 'pdf' : lower.endsWith('.json') ? 'json' : 'docx',
        blobPath,
        source: 'system',
      })
    },
    onError: (err) => {
      setOutlineUploadError(err instanceof Error ? err.message : 'Failed to upload structure file')
    },
  })

  useEffect(() => {
    latestWizardDataRef.current = wizardData
    latestAudienceRef.current = audience
    latestOutlinePasteTextRef.current = outlinePasteText
    generateTORef.current = generateTO
  }, [wizardData, audience, outlinePasteText, generateTO])

  const handleGenerateOutline = useCallback(() => {
    if (generateTORef.current.isPending) return
    const composite = buildCompositePrompt(latestWizardDataRef.current, latestAudienceRef.current)
    setCustomToPrompt(composite)
    generateTORef.current.mutate()
  }, [setCustomToPrompt])

  const createOutlineDocxFile = useCallback(
    async (outlineText: string) => {
      const lines = outlineText
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.trim().length > 0)

      const doc = new Document({
        sections: [
          {
            children: lines.map((line) => new Paragraph({ text: line })),
          },
        ],
      })
      const blob = await Packer.toBlob(doc)
      const safeTitle = (courseTitle || 'course_outline')
        .trim()
        .replace(/[^a-zA-Z0-9-_ ]+/g, '')
        .replace(/\s+/g, '_')
      return new File([blob], `${safeTitle || 'course_outline'}.docx`, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    },
    [courseTitle],
  )

  const handleOutlineUpload = useCallback(
    async (files: FileList | File[]) => {
      const accepted = Array.from(files).find((file) => {
        const lower = file.name.toLowerCase()
        return lower.endsWith('.docx') || lower.endsWith('.pdf') || lower.endsWith('.json')
      })
      if (!accepted) {
        setOutlineUploadError('Please upload a .docx, .pdf, or .json structure file.')
        return
      }
      if (!courseTopic.trim()) {
        setOutlineUploadError('Please complete the course basics before uploading a structure.')
        return
      }
      await uploadOutlineFile(accepted)
      setWizardData({ outlineMode: 'upload' })
    },
    [courseTopic, uploadOutlineFile],
  )

  const handleGenerateFromPastedOutline = useCallback(() => {
    const pastedText = latestOutlinePasteTextRef.current.trim()
    if (generateTORef.current.isPending || !pastedText) return

    setWizardData({ outlineMode: 'paste' })
    generateTORef.current.mutate()
  }, [setWizardData])

  const handleViewOutline = useCallback(() => {
    setPhase('wizard-outline-review')
  }, [setPhase])

  useEffect(() => {
    if (outlineMode === 'paste' && outlinePasteText.trim()) {
      markOutlineStaleFromPasteChange(outlinePasteText.trim())
    }
  }, [outlinePasteText, outlineMode, markOutlineStaleFromPasteChange])

  useEffect(() => {
    if (outlineMode === 'generate') {
      if (hasExistingTO && !generateTO.isPending) {
        // TO already generated — skip API, go straight to review
        setConfig({
          backPhase: 'wizard-direction',
          backLabel: 'Back',
          nextLabel: 'View Structure',
          isNextLoading: false,
          isNextDisabled: false,
          onNext: handleViewOutline,
        })
      } else {
        setConfig({
          backPhase: 'wizard-direction',
          backLabel: 'Back',
          nextLabel: generateTO.isPending ? 'Generating...' : 'Generate Structure',
          isNextLoading: generateTO.isPending,
          isNextDisabled: generateTO.isPending,
          onNext: handleGenerateOutline,
        })
      }
    } else if (hasOwnOutline) {
      if (hasPastedOutline && (pasteOutlineNeedsRegen || !hasExistingTO)) {
        setConfig({
          backPhase: 'wizard-direction',
          backLabel: 'Back',
          nextLabel: generateTO.isPending
            ? 'Regenerating...'
            : pasteOutlineNeedsRegen
              ? 'Regenerate Structure'
              : 'Create Structure',
          isNextLoading: generateTO.isPending,
          isNextDisabled: generateTO.isPending,
          onNext: handleGenerateFromPastedOutline,
        })
      } else if (hasExistingTO && !generateTO.isPending) {
        setConfig({
          backPhase: 'wizard-direction',
          backLabel: 'Back',
          nextLabel: 'View Structure',
          isNextLoading: false,
          isNextDisabled: false,
          onNext: handleViewOutline,
        })
      } else if (hasOutlineFile) {
        setConfig({
          backPhase: 'wizard-direction',
          backLabel: 'Back',
          nextPhase: 'wizard-outline-review',
          nextLabel: 'Review Structure',
          isNextDisabled: isUploadingOutline,
          isNextLoading: isUploadingOutline,
        })
      } else if (outlinePasteText.trim().length > 0) {
        setConfig({
          backPhase: 'wizard-direction',
          backLabel: 'Back',
          nextLabel: generateTO.isPending ? 'Creating Structure...' : 'Create Structure',
          isNextLoading: generateTO.isPending,
          isNextDisabled: generateTO.isPending,
          onNext: handleGenerateFromPastedOutline,
        })
      } else {
        setConfig({
          backPhase: 'wizard-direction',
          backLabel: 'Back',
          nextLabel: 'Review Structure',
          isNextDisabled: true,
        })
      }
    }
  }, [
    hasOwnOutline,
    hasExistingTO,
    hasPastedOutline,
    pasteOutlineNeedsRegen,
    generateTO.isPending,
    outlinePasteText,
    hasOutlineFile,
    isUploadingOutline,
    setConfig,
    handleViewOutline,
    handleGenerateOutline,
    handleGenerateFromPastedOutline,
  ])

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
      learningObjectives: (wizardData?.objectives ?? []).length > 0 ? wizardData.objectives : undefined,
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
    if (e.dataTransfer.files.length > 0) void handleOutlineUpload(e.dataTransfer.files)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) void handleOutlineUpload(e.target.files)
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
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Course Structure</p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">How would you like to structure this?</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">Upload your own course structure, or let the AI build one from your materials and settings.</p>
      </motion.div>

      {/* Option cards */}
      <motion.div className="space-y-3" variants={fadeUp}>
        <motion.button
          type="button"
          onClick={() => setWizardData({ outlineMode: hasOwnOutline ? outlineMode : 'upload' })}
          style={{ willChange: 'transform' }}
          whileHover={{ y: -3, scale: 1.01, boxShadow: '0 8px 24px rgba(99,102,241,0.08)' }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'w-full flex items-start gap-4 p-5 rounded-xl cursor-pointer transition-colors text-left',
            hasOwnOutline
              ? 'border-2 border-indigo-500 bg-indigo-50/60'
              : 'border border-slate-200/80 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50/20',
          )}
        >
          <div
            className={cn(
              'p-2.5 rounded-lg shrink-0',
              hasOwnOutline ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
            )}
          >
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">I have a structure</p>
            <p className="text-xs text-slate-500 mt-0.5">Upload a file or paste your course structure</p>
          </div>
        </motion.button>

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
            <p className="text-sm font-semibold text-slate-800">Create one for me</p>
            <p className="text-xs text-slate-500 mt-0.5">Let the AI build a structured course from your materials</p>
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
              className={hasExistingTO ? 'bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3' : 'bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3'}
              variants={fadeIn}
            >
              {outlineStaleFromLo && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Learning objectives changed since the last structure was built.
                    Generate a new structure to keep chapters aligned with your updated LOs.
                  </span>
                </div>
              )}
              {hasExistingTO ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-800">Structure already generated</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Click <strong>View Structure</strong> to review your existing structure, or regenerate it below if you've changed your settings.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const composite = buildCompositePrompt(wizardData, audience)
                      setCustomToPrompt(composite)
                      generateTO.mutate()
                    }}
                    disabled={generateTO.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-300 bg-white rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate Structure
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-500" />
                    <p className="text-sm font-semibold text-slate-800">Ready to create your course structure?</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    The assistant will analyze your source materials and build a structured course from all the details you've provided.
                  </p>
                </>
              )}

              {generateTO.isError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{generateTO.error?.message ?? 'An error occurred. Please try again.'}</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {hasOwnOutline && (
          <motion.div
            key="own-outline-mode"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
            style={{ willChange: 'transform' }}
          >
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="show"
              className="rounded-xl border border-border bg-white p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-brand-100 text-brand-600 shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Upload structure file</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Drop or browse a <span className="font-medium">.docx</span>, <span className="font-medium">.pdf</span>, or <span className="font-medium">.json</span> structure file.
                  </p>
                </div>
              </div>

              <motion.div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{ willChange: 'transform' }}
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all',
                  isDragging
                    ? 'border-brand-600 bg-brand-200/20'
                    : 'border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-100/10',
                )}
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">Drop your structure file here or click to browse</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".docx,.pdf,.json"
                  className="hidden"
                  onChange={handleInputChange}
                />
              </motion.div>

              {toDocument && (
                <AnimatePresence initial={false}>
                  <motion.div
                    key={toDocument.id}
                    variants={fileItemVariant}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    layout
                    style={{ willChange: 'transform' }}
                    className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{toDocument.name}</p>
                      <p className="text-xs text-slate-400">{formatBytes(toDocument.sizeBytes)}</p>
                    </div>
                    <motion.button
                      type="button"
                      onClick={() => setToDocument(null)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="shrink-0 p-1 text-slate-400 hover:text-red-400 transition-colors rounded"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                </AnimatePresence>
              )}

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">or</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-brand-100 text-brand-600 shrink-0">
                  <ClipboardPaste className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Paste structure text</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Paste headings, numbered chapters, bullets, or a draft section structure. Then click{' '}
                    <strong>{pasteOutlineNeedsRegen ? 'Regenerate Structure' : 'Create Structure'}</strong> below.
                  </p>
                </div>
              </div>

              {outlineStaleFromPaste && hasPastedOutline && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Pasted structure changed — click <strong>Regenerate Structure</strong> to rebuild from your new text.
                  </span>
                </div>
              )}

              <textarea
                rows={10}
                value={outlinePasteText}
                onChange={(e) => {
                  setToDocument(null)
                  setWizardData({ outlinePasteText: e.target.value, outlineMode: 'paste' })
                }}
                placeholder={`Example:\n1. Introduction to Health Plans\n1.1 Employer responsibilities\n1.2 Employee eligibility\n2. Plan types\n2.1 HMO\n2.2 PPO`}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-y min-h-[180px]"
              />
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  {outlinePasteText.trim()
                    ? `${outlinePasteText.trim().length.toLocaleString()} characters pasted`
                    : 'No structure text pasted yet'}
                </span>
                {outlinePasteText.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setToDocument(null)
                      setWizardData({ outlinePasteText: '' })
                    }}
                    className="font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </motion.div>

            {(outlineUploadError || generateTO.isError) && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {outlineUploadError ?? generateTO.error?.message ?? 'An error occurred. Please try again.'}
                </span>
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
