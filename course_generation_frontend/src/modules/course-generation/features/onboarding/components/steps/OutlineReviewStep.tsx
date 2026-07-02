import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, BookOpen, Clock, Download, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { AIGenerationLoader } from '../AIGenerationLoader'
import { useCourseStore } from '../../../../store/courseStore'
import { useGenerateTO } from '../../../upload/hooks/useGenerateTO'
import { useWizardNav } from '../WizardNavContext'
import type { JsonObject } from '../../../../types'
import { exportTrainingOutlineToDocx } from '../../../../utils/exportTrainingOutline'

// ── Animation variants ─────────────────────────────────────────────────────

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

const badgeVariant = {
  hidden: { opacity: 0, scale: 0.88 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
}

const TITLE_KEYS = ['title', 'name', 'section_title', 'topic_title', 'heading'] as const
const STRING_CHILD_KEYS = ['subtopics', 'sub_topics', 'subtopic', 'sub_topic'] as const
const OBJECT_CHILD_KEYS = ['topics', 'sections', 'chapters', 'modules', 'units', 'lessons', 'items', 'parts', 'sub_sections'] as const

// ── Helpers ────────────────────────────────────────────────────────────────

function getSections(toData: JsonObject): JsonObject[] {
  const sections = toData.sections ?? toData.modules
  if (Array.isArray(sections)) return sections as JsonObject[]
  return []
}

function getSectionTitle(section: JsonObject): string {
  return (
    (section.title as string | undefined) ??
    (section.name as string | undefined) ??
    'Untitled Section'
  )
}

/** Strip leading N.0 / N. chapter prefix when the UI already shows a chapter badge. */
function displaySectionTitle(section: JsonObject): string {
  const raw = getSectionTitle(section).trim()
  const withoutPrefix = raw.replace(/^\s*\d+(?:\.\d+)?\s+/, '').trim()
  return withoutPrefix || raw
}

function getSectionMeta(section: JsonObject): string {
  const wc = section.word_count ?? section.wordCount
  const mins = section.minutes ?? section.duration_minutes
  const ch = section.credit_hours ?? section.credit_hour
  const parts: string[] = []
  if (typeof wc === 'number') parts.push(`${wc.toLocaleString()} words`)
  if (typeof mins === 'number') parts.push(`${mins} min`)
  if (typeof ch === 'number') parts.push(`${ch.toFixed(2)} CE hrs`)
  return parts.join(' · ')
}

function getNodeTitleInfo(node: JsonObject): { key: string; value: string } | null {
  for (const key of TITLE_KEYS) {
    const value = node[key]
    if (typeof value === 'string' && value.trim()) {
      return { key, value }
    }
  }
  return null
}

function getStringChildInfo(node: JsonObject): { key: string; items: string[] } | null {
  for (const key of STRING_CHILD_KEYS) {
    const value = node[key]
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      return { key, items: value as string[] }
    }
  }
  return null
}

function getObjectChildInfo(node: JsonObject): { key: string; items: JsonObject[] } | null {
  for (const key of OBJECT_CHILD_KEYS) {
    const value = node[key]
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))
    ) {
      return { key, items: value as JsonObject[] }
    }
  }
  return null
}

// ── Component ──────────────────────────────────────────────────────────────

export const OutlineReviewStep = () => {
  const setPhase = useCourseStore((s) => s.setPhase)
  const toData = useCourseStore((s) => s.toData)
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const detectedRuleFamily = useCourseStore((s) => s.detectedRuleFamily)
  const audience = useCourseStore((s) => s.audience)
  const durationHours = useCourseStore((s) => s.durationHours)
  const difficultyLevel = useCourseStore((s) => s.difficultyLevel)
  const wizardData = useCourseStore((s) => s.wizardData)
  const updateTOField = useCourseStore((s) => s.updateTOField)
  const generateTO = useGenerateTO()

  const [isEditingOutline, setIsEditingOutline] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-outline-pref',
      backLabel: 'Back',
      nextLabel: 'Enter Workspace',
      isNextDisabled: !toData,
      onNext: () => setPhase('three-panel'),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toData])

  const courseName =
    (toData?.course_name as string | undefined) ||
    (toData?.courseTitle as string | undefined) ||
    courseTitle

  const totalCreditHours =
    (toData?.total_credit_hours as number | undefined) ??
    ((toData?.totals as JsonObject | undefined)?.credit_hours as number | undefined)

  const description =
    (toData?.description as string | undefined) ??
    (toData?.course_description as string | undefined)

  const sections = toData ? getSections(toData) : []
  // Cap stagger at 8 items to avoid long delays
  const visibleSections = sections.slice(0, 8)

  const handleRegenerate = () => {
    generateTO.mutate()
  }

  const renderEditableNode = (node: JsonObject, path: string[], level = 0): JSX.Element => {
    const titleInfo = getNodeTitleInfo(node)
    const stringChild = getStringChildInfo(node)
    const objectChild = getObjectChildInfo(node)

    return (
      <div
        key={path.join('.')}
        className={cn(
          'rounded-xl border border-slate-200 bg-white',
          level === 0 ? 'p-4' : 'p-3',
        )}
      >
        {titleInfo && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {level === 0 ? 'Chapter' : 'Subtopic'}
            </p>
            <input
              value={titleInfo.value}
              onChange={(e) => updateTOField([...path, titleInfo.key], e.target.value)}
              className={cn(
                'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all',
                'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10',
                level === 0 ? 'font-semibold' : '',
              )}
            />
          </div>
        )}

        {stringChild && stringChild.items.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Subtopic Text</p>
            {stringChild.items.map((item, index) => (
              <input
                key={`${path.join('.')}.${stringChild.key}.${index}`}
                value={item}
                onChange={(e) => updateTOField([...path, stringChild.key, String(index)], e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
              />
            ))}
          </div>
        )}

        {objectChild && objectChild.items.length > 0 && (
          <div className="mt-3 space-y-3">
            {objectChild.items.map((child, index) =>
              renderEditableNode(child, [...path, objectChild.key, String(index)], level + 1),
            )}
          </div>
        )}
      </div>
    )
  }

  const handleDownloadTO = async () => {
    if (!toData || isDownloading) return

    setDownloadError(null)
    setIsDownloading(true)

    try {
      await exportTrainingOutlineToDocx(toData, {
        courseTitle:
          courseName ||
          (toData.course_title as string | undefined) ||
          (toData.course_name as string | undefined) ||
          'Untitled Course',
        ruleFamily: detectedRuleFamily || (toData.rule_family as string | undefined) || undefined,
        audience: audience || wizardData.selectedAudiences.join(', ') || undefined,
        difficultyLevel,
        durationHours,
        description: wizardData.description || description || undefined,
        objectives: wizardData.objectives,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not download the course structure.'
      setDownloadError(message)
    } finally {
      setIsDownloading(false)
    }
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
        <p className="text-slate-500 text-sm">No structure data found. Please go back and generate one.</p>
        <button
          onClick={() => setPhase('wizard-outline-pref')}
          className="text-sm text-brand-600 underline"
        >
          Back to Course Structure
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
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">Your structure is ready</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">Review the proposed structure. Regenerate, refine, or continue into the full course editor.</p>
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

      {/* Section list */}
      <AnimatePresence>
        {sections.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {isEditingOutline
              ? sections.map((section, i) => (
                  <motion.div
                    key={`editable-${i}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35, delay: Math.min(i, 7) * 0.04 }}
                    className="space-y-2"
                    style={{ willChange: 'transform' }}
                  >
                    <div className="flex items-center gap-3 px-1">
                      <div className="shrink-0 w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-xs font-semibold text-brand-600">
                        {i + 1}
                      </div>
                      <p className="text-sm font-semibold text-slate-700">Chapter {i + 1}</p>
                      {getSectionMeta(section) && (
                        <span className="text-xs text-slate-400">{getSectionMeta(section)}</span>
                      )}
                    </div>
                    {renderEditableNode(section, ['sections', String(i)], 0)}
                  </motion.div>
                ))
              : visibleSections.map((section, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35, delay: i * 0.04 }}
                    className="flex items-center justify-between gap-3 p-4 bg-white border border-border rounded-xl"
                    style={{ willChange: 'transform' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: i * 0.04 + 0.05 }}
                        className="shrink-0 w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-xs font-semibold text-brand-600"
                        style={{ willChange: 'transform' }}
                      >
                        {i + 1}
                      </motion.div>
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {displaySectionTitle(section)}
                      </p>
                    </div>
                    {getSectionMeta(section) && (
                      <span className="shrink-0 text-xs text-slate-400">{getSectionMeta(section)}</span>
                    )}
                  </motion.div>
                ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error alert */}
      <AnimatePresence>
        {(generateTO.isError || downloadError) && (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {downloadError ?? generateTO.error?.message ?? 'An error occurred. Please try again.'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secondary actions: Edit (left) · Regenerate (middle) · Download TO (right) */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
        <motion.button
          type="button"
          onClick={() => setIsEditingOutline((current) => !current)}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="flex-1 py-2.5 px-4 border border-slate-200 bg-white text-slate-700 text-sm font-semibold rounded-xl hover:border-brand-300 hover:text-brand-600 transition-colors"
          style={{ willChange: 'transform' }}
        >
          {isEditingOutline ? 'Done Editing' : 'Edit Structure'}
        </motion.button>
        <motion.button
          type="button"
          onClick={handleRegenerate}
          disabled={generateTO.isPending}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="flex-1 py-2.5 px-4 border border-brand-200 bg-brand-50 text-brand-700 text-sm font-semibold rounded-xl hover:bg-brand-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ willChange: 'transform' }}
        >
          <RefreshCw className={cn('w-4 h-4', generateTO.isPending && 'animate-spin')} />
          Regenerate
        </motion.button>
        <motion.button
          type="button"
          onClick={handleDownloadTO}
          disabled={isDownloading}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="flex-1 py-2.5 px-4 border border-slate-200 bg-white text-slate-700 text-sm font-semibold rounded-xl hover:border-brand-300 hover:text-brand-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ willChange: 'transform' }}
        >
          <Download className="w-4 h-4" />
          {isDownloading ? 'Preparing Download…' : 'Download Structure'}
        </motion.button>
      </motion.div>

      {/* Edit note toast */}
      <AnimatePresence>
        {isEditingOutline && (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            You can edit chapter titles and subtopic text here. Broader structure changes still belong in the full workspace.
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  )
}
