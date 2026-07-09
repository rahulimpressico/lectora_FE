import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, BookOpen, Clock, Download, Loader2, Pencil, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { getDisplayErrorMessage } from '@/api/errors'
import { AIGenerationLoader } from '../../components/AIGenerationLoader'
import { OutlineSectionsEditor } from './OutlineSectionsEditor'
import { getOutlineSections } from '../utils'
import { useCourseStore } from '../../store'
import { useGenerateTO } from '../../../upload/hooks/useGenerateTO'
import { useRegenerateTO } from '../hooks/useRegenerateTO'
import { useDownloadTrainingOutline } from '../../../review/hooks/useDownloadTrainingOutline'
import { usePersistTrainingOutline } from './usePersistTrainingOutline'
import { useWizardNav } from '../../components/WizardNavContext'
import type { JsonObject } from '../../../../types'
import { fadeUp, fadeIn, scaleIn, staggerContainer } from '../../constants/animations'
import { badgeVariant } from '../constants'

// ── Component ──────────────────────────────────────────────────────────────

export const OutlineReviewStep = () => {
  const setPhase = useCourseStore((s) => s.setPhase)
  const toData = useCourseStore((s) => s.toData)
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const updateTOField = useCourseStore((s) => s.updateTOField)
  const generateTO = useGenerateTO()
  const regenerateTO = useRegenerateTO()
  const persistTrainingOutline = usePersistTrainingOutline()
  const { download: handleDownload, downloading } = useDownloadTrainingOutline()

  const [isEditing, setIsEditing] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())
  const [persistError, setPersistError] = useState<string | null>(null)
  const [showRegeneratePrompt, setShowRegeneratePrompt] = useState(false)
  const [regenerationPrompt, setRegenerationPrompt] = useState('')

  const { setConfig } = useWizardNav()

  const handleEnterWorkspace = () => {
    setPersistError(null)
    persistTrainingOutline.mutate(undefined, {
      onSuccess: () => setPhase('three-panel'),
      onError: (err) => {
        setPersistError(err instanceof Error ? err.message : 'Failed to save the Training Outline.')
      },
    })
  }

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-outline-pref',
      backLabel: 'Back',
      nextLabel: persistTrainingOutline.isPending ? 'Saving…' : 'Enter Workspace',
      isNextDisabled: !toData || persistTrainingOutline.isPending,
      isNextLoading: persistTrainingOutline.isPending,
      loadingLabel: 'Saving…',
      onNext: handleEnterWorkspace,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toData, persistTrainingOutline.isPending])

  const courseName =
    (toData?.course_name as string | undefined) ||
    (toData?.courseTitle as string | undefined) ||
    courseTitle

  const rawCreditHours =
    toData?.total_credit_hours ??
    (toData?.totals as JsonObject | undefined)?.credit_hours
  const totalCreditHours =
    rawCreditHours != null && !Number.isNaN(Number(rawCreditHours))
      ? Number(rawCreditHours)
      : undefined

  const description =
    (toData?.description as string | undefined) ??
    (toData?.course_description as string | undefined)

  const sections = toData ? getOutlineSections(toData) : []

  const handleRegenerateClick = () => {
    setShowRegeneratePrompt(true)
  }

  const handleConfirmRegenerate = () => {
    regenerateTO.mutate(regenerationPrompt, {
      onSuccess: () => {
        setShowRegeneratePrompt(false)
        setRegenerationPrompt('')
      },
    })
  }

  const handleCancelRegenerate = () => {
    setShowRegeneratePrompt(false)
    setRegenerationPrompt('')
    regenerateTO.reset()
  }

  const toggleEditMode = () => {
    setIsEditing((prev) => {
      const next = !prev
      if (next && expandedSections.size === 0 && sections.length > 0) {
        setExpandedSections(new Set([0]))
      }
      if (!next) {
        setExpandedSections(new Set())
      }
      return next
    })
  }

  const toggleSection = (index: number) => {
    if (!isEditing) return
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  // ── Loading state ──────────────────────────────────────────────────────

  if (generateTO.isPending) {
    return (
      <AIGenerationLoader
        onCancel={generateTO.cancel}
        statusMessage={generateTO.statusMessage}
      />
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────

  if (!toData) {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center justify-center gap-4 py-24"
      >
        <p className="text-slate-500 text-sm">No outline data found. Please go back and generate one.</p>
        <button
          onClick={() => setPhase('wizard-outline-pref')}
          className="text-sm text-brand-600 underline"
        >
          Back to Outline Preference
        </button>
      </motion.div>
    )
  }

  // ── Main content ───────────────────────────────────────────────────────

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-5 sm:space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-8 sm:mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Structure Review</p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">Your Course Structure is ready</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">
          {isEditing
            ? 'Click a chapter to expand it, then edit the title and sub-topics.'
            : 'Review the proposed structure. Regenerate, refine, or continue into the full course editor.'}
        </p>
      </motion.div>

      {/* Summary card */}
      <motion.div
        variants={scaleIn}
        transition={{ delay: 0.08 }}
        className="bg-white border border-border rounded-xl p-5 space-y-3"
        style={{ willChange: 'transform' }}
      >
        <h3 className="text-base font-bold text-slate-900">{courseName || 'Untitled Course'}</h3>
        {description && (
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        )}
        <motion.div
          variants={staggerContainer}
          className="flex flex-wrap gap-3"
        >
          {sections.length > 0 && (
            <motion.span
              variants={badgeVariant}
              className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full"
            >
              <BookOpen className="w-3.5 h-3.5 text-brand-400" />
              {sections.length} section{sections.length !== 1 ? 's' : ''}
            </motion.span>
          )}
          {totalCreditHours != null && (
            <motion.span
              variants={badgeVariant}
              className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full"
            >
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              {totalCreditHours.toFixed(2)} CE credit hours
            </motion.span>
          )}
        </motion.div>
      </motion.div>

      {/* Section list / editor */}
      <AnimatePresence>
        {sections.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <OutlineSectionsEditor
              toData={toData}
              isEditing={isEditing}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
              onUpdate={updateTOField}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error alert */}
      <AnimatePresence>
        {(generateTO.isError || regenerateTO.isError || persistError) && (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {persistError ??
                getDisplayErrorMessage(generateTO.error ?? regenerateTO.error)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regenerate prompt */}
      <AnimatePresence>
        {showRegeneratePrompt && (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-3"
          >
            <label htmlFor="regeneration-prompt" className="block text-sm font-semibold text-slate-800">
              What would you like to change?
            </label>
            <textarea
              id="regeneration-prompt"
              value={regenerationPrompt}
              onChange={(e) => setRegenerationPrompt(e.target.value)}
              placeholder="e.g. Add a chapter on advanced topics, make the tone more casual…"
              rows={3}
              disabled={regenerateTO.isPending}
              className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancelRegenerate}
                disabled={regenerateTO.isPending}
                className="py-2 px-4 text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegenerate}
                disabled={regenerateTO.isPending || !regenerationPrompt.trim()}
                className="py-2 px-4 text-sm font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={cn('w-4 h-4', regenerateTO.isPending && 'animate-spin')} />
                {regenerateTO.isPending ? 'Regenerating…' : 'Confirm Regenerate'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secondary actions */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <motion.button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          title="Download Course Structure as DOCX"
          className="flex-1 py-2.5 px-4 border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ willChange: 'transform' }}
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloading ? 'Generating…' : 'Download'}
        </motion.button>
        <motion.button
          type="button"
          onClick={toggleEditMode}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'flex-1 py-2.5 px-4 border text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2',
            isEditing
              ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-600',
          )}
          style={{ willChange: 'transform' }}
        >
          <Pencil className="w-4 h-4" />
          {isEditing ? 'Done Editing' : 'Edit Structure'}
        </motion.button>
        <motion.button
          type="button"
          onClick={handleRegenerateClick}
          disabled={generateTO.isPending || regenerateTO.isPending}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="flex-1 py-2.5 px-4 border border-brand-200 bg-brand-50 text-brand-700 text-sm font-semibold rounded-xl hover:bg-brand-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ willChange: 'transform' }}
        >
          <RefreshCw className={cn('w-4 h-4', regenerateTO.isPending && 'animate-spin')} />
          Regenerate
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
