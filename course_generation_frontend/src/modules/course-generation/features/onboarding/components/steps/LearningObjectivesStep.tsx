import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, CheckCircle2, ClipboardList, Loader2, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react'
import { useCourseStore } from '../../../../store/courseStore'
import { useWizardNav } from '../WizardNavContext'
import { generateLearningObjectives } from '@/api/course-generation/api'
import { cn } from '@/lib/cn'

// ─── Animation variants ───────────────────────────────────────────────────────

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

const modeCardVariant = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

const objectiveRowVariant = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
  exit: { opacity: 0, x: -16, height: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
}

const backdropVariant = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
}

const modalPanelVariant = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.2, ease: [0.55, 0, 1, 0.45] as const } },
}

// ─── AI Generation Modal ──────────────────────────────────────────────────────

interface GenerateModalProps {
  onClose: () => void
  onGenerated: (objectives: string[]) => void
  courseTitle: string
  courseDescription: string
  audience: string
  experienceLevel: string
  sourceMaterials: string[]
}

function GenerateObjectivesModal({
  onClose,
  onGenerated,
  courseTitle,
  courseDescription,
  audience,
  experienceLevel,
  sourceMaterials,
}: GenerateModalProps) {
  const [coursePurpose, setCoursePurpose] = useState('')
  const [targetAudience, setTargetAudience] = useState(audience)
  const [skillLevel, setSkillLevel] = useState(experienceLevel)
  const [desiredOutcomes, setDesiredOutcomes] = useState('')
  const [certificationFocus, setCertificationFocus] = useState('')
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    setIsLoading(true)
    setError(null)
    generateLearningObjectives({
      sourceMaterials,
      courseTitle: courseTitle || undefined,
      courseDescription: (courseDescription || coursePurpose) || undefined,
      targetAudience: targetAudience || undefined,
      skillLevel: skillLevel || undefined,
      desiredOutcomes: desiredOutcomes || undefined,
      certificationFocus: certificationFocus || undefined,
      additionalInstructions: additionalInstructions || undefined,
    })
      .then((result) => {
        onGenerated(result.learningObjectives)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Generation failed. Please try again.')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          variants={backdropVariant}
          initial="hidden"
          animate="show"
          exit="exit"
          onClick={onClose}
          style={{ willChange: 'opacity' }}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
          variants={modalPanelVariant}
          initial="hidden"
          animate="show"
          exit="exit"
          style={{ willChange: 'transform' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Generate Learning Objectives</h3>
                <p className="text-xs text-slate-500">Fill in details to get AI-crafted objectives</p>
              </div>
            </div>
            <motion.button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Course Purpose</label>
              <textarea
                rows={2}
                value={coursePurpose}
                onChange={(e) => setCoursePurpose(e.target.value)}
                placeholder="What problem does this course solve or skill does it build?"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Target Audience</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. New insurance agents, compliance officers"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Skill Level</label>
              <div className="flex gap-2">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
                  <motion.button
                    key={level}
                    type="button"
                    onClick={() => setSkillLevel(level)}
                    className={cn(
                      'flex-1 py-2 text-xs font-semibold rounded-lg border transition-all',
                      skillLevel === level
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300',
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {level}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Desired Outcomes</label>
              <textarea
                rows={2}
                value={desiredOutcomes}
                onChange={(e) => setDesiredOutcomes(e.target.value)}
                placeholder="What should learners be able to do after completing this course?"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Certification / Compliance Focus <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
              <input
                type="text"
                value={certificationFocus}
                onChange={(e) => setCertificationFocus(e.target.value)}
                placeholder="e.g. NAIC CE compliance, Series 7 prep, GDPR readiness"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Additional Instructions <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
              <textarea
                rows={2}
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="Any specific focus, tone, or depth you need..."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
              />
            </div>

            {error && (
              <motion.div
                className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700"
                variants={fadeIn}
                initial="hidden"
                animate="show"
              >
                {error}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <motion.button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={isLoading ? {} : { scale: 1.03 }}
              whileTap={isLoading ? {} : { scale: 0.97 }}
              style={{ willChange: 'transform' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Objectives
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  )
}

// ─── Editable Objectives List ─────────────────────────────────────────────────

interface EditableObjectivesListProps {
  objectives: string[]
  onChange: (objectives: string[]) => void
  onRegenerate: () => void
}

function EditableObjectivesList({ objectives, onChange, onRegenerate }: EditableObjectivesListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newObjective, setNewObjective] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  const startEdit = (i: number) => {
    setEditingIndex(i)
    setEditValue(objectives[i])
    setTimeout(() => editRef.current?.focus(), 50)
  }

  const commitEdit = () => {
    if (editingIndex === null) return
    const trimmed = editValue.trim()
    if (trimmed) {
      const next = [...objectives]
      next[editingIndex] = trimmed
      onChange(next)
    }
    setEditingIndex(null)
  }

  const deleteObjective = (i: number) => {
    onChange(objectives.filter((_, idx) => idx !== i))
  }

  const addObjective = () => {
    const trimmed = newObjective.trim()
    if (!trimmed) return
    onChange([...objectives, trimmed])
    setNewObjective('')
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {objectives.map((obj, i) => (
          <motion.div
            key={`obj-${i}-${obj.slice(0, 16)}`}
            className="group flex items-start gap-2.5 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors"
            variants={objectiveRowVariant}
            initial="hidden"
            animate="show"
            exit="exit"
            layout
            style={{ willChange: 'transform' }}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            {editingIndex === i ? (
              <input
                ref={editRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingIndex(null) }}
                className="flex-1 text-sm text-slate-800 bg-transparent outline-none border-b border-indigo-400 pb-0.5"
              />
            ) : (
              <span
                className="flex-1 text-sm text-slate-700 leading-snug cursor-text"
                onClick={() => startEdit(i)}
                title="Click to edit"
              >
                {obj}
              </span>
            )}
            <motion.button
              type="button"
              onClick={() => deleteObjective(i)}
              className="shrink-0 p-1 text-slate-300 transition-colors opacity-0 group-hover:opacity-100 rounded"
              aria-label="Delete objective"
              whileHover={{ scale: 1.1, color: '#f87171' }}
              whileTap={{ scale: 0.9 }}
              style={{ willChange: 'transform' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add manually */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newObjective}
          onChange={(e) => setNewObjective(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addObjective() }}
          placeholder="Add a custom objective..."
          className="flex-1 px-3 py-2.5 text-sm border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
        />
        <motion.button
          type="button"
          onClick={addObjective}
          disabled={!newObjective.trim()}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all disabled:opacity-40"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Regenerate */}
      <motion.button
        type="button"
        onClick={onRegenerate}
        className="flex items-center gap-2 w-full justify-center py-2.5 px-4 border border-dashed border-indigo-200 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-all"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{ willChange: 'transform' }}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Regenerate with different instructions
      </motion.button>
    </div>
  )
}

// ─── Main Step ────────────────────────────────────────────────────────────────

const AI_CONTEXT_BULLETS = [
  'Course title & description',
  'Duration & difficulty',
  'Target audience',
  'Source materials',
]

export const LearningObjectivesStep = () => {
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const audience = useCourseStore((s) => s.audience)
  const rawDocuments = useCourseStore((s) => s.rawDocuments)

  const objectivesMode = wizardData.objectivesMode ?? 'ai-generated'
  const objectives = wizardData.objectives ?? []

  const [rawText, setRawText] = useState<string>(objectives.join('\n'))
  const [showModal, setShowModal] = useState(false)

  const sourceMaterials = rawDocuments
    .filter((d) => d.status === 'success' && d.blobPath)
    .map((d) => d.blobPath as string)

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-materials',
      backLabel: 'Back',
      nextPhase: 'wizard-direction',
      nextLabel: 'Next: Course Direction',
      isNextDisabled: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTextChange = (text: string) => {
    setRawText(text)
    const parsed = text.split('\n').map((line) => line.trim()).filter(Boolean)
    setWizardData({ objectives: parsed })
  }

  const handleGenerated = (newObjectives: string[]) => {
    setWizardData({ objectives: newObjectives })
    setShowModal(false)
  }

  return (
    <>
      <motion.div
        className="space-y-5 sm:space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div className="mb-8 sm:mb-10" variants={fadeUp} style={{ willChange: 'transform' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Learning Goals</p>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">What should learners achieve?</h2>
          <p className="text-slate-500 text-base leading-relaxed max-w-md">Clear objectives anchor every section to a measurable, defensible outcome.</p>
        </motion.div>

        {/* Mode selection cards */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-3" variants={staggerContainer}>
          <motion.button
            type="button"
            onClick={() => setWizardData({ objectivesMode: 'provided' })}
            className={cn(
              'flex flex-col items-start gap-3 p-5 rounded-xl cursor-pointer transition-all text-left',
              objectivesMode === 'provided'
                ? 'border-2 border-brand-500 bg-brand-50 shadow-sm'
                : 'border border-slate-200 bg-white shadow-sm hover:border-brand-300 hover:bg-brand-50/50',
            )}
            variants={modeCardVariant}
            animate={objectivesMode === 'provided' ? { scale: 1.02 } : { scale: 1 }}
            whileHover={{ y: -3, scale: 1.01, boxShadow: '0 8px 24px rgba(99,102,241,0.1)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{ willChange: 'transform' }}
          >
            <div className={cn('p-2.5 rounded-lg', objectivesMode === 'provided' ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500')}>
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">I already have learning objectives</p>
              <p className="text-xs text-slate-500 mt-0.5">Paste your own objectives</p>
            </div>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setWizardData({ objectivesMode: 'ai-generated' })}
            className={cn(
              'flex flex-col items-start gap-3 p-5 rounded-xl cursor-pointer transition-all text-left',
              objectivesMode === 'ai-generated'
                ? 'border-2 border-brand-500 bg-brand-50 shadow-sm'
                : 'border border-slate-200 bg-white shadow-sm hover:border-brand-300 hover:bg-brand-50/50',
            )}
            variants={modeCardVariant}
            animate={objectivesMode === 'ai-generated' ? { scale: 1.02 } : { scale: 1 }}
            whileHover={{ y: -3, scale: 1.01, boxShadow: '0 8px 24px rgba(99,102,241,0.1)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{ willChange: 'transform' }}
          >
            <div className={cn('p-2.5 rounded-lg', objectivesMode === 'ai-generated' ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500')}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Help Me Create Them</p>
              <p className="text-xs text-slate-500 mt-0.5">AI generates objectives from your course details</p>
            </div>
          </motion.button>
        </motion.div>

        {/* Provided mode */}
        <AnimatePresence mode="wait">
          {objectivesMode === 'provided' && (
            <motion.div
              key="provided"
              className="space-y-3"
              variants={fadeIn}
              initial="hidden"
              animate="show"
              exit="hidden"
            >
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Your Learning Objectives</label>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Enter each objective on a new line..."
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
                />
              </div>
              {objectives.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    {objectives.length} objective{objectives.length !== 1 ? 's' : ''} detected
                  </p>
                  <ul className="space-y-1.5">
                    {objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-600 text-xs flex items-center justify-center font-semibold mt-0.5">
                          {i + 1}
                        </span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {/* AI-generated mode */}
          {objectivesMode === 'ai-generated' && (
            <motion.div
              key="ai-generated"
              className="space-y-4"
              variants={fadeIn}
              initial="hidden"
              animate="show"
              exit="hidden"
            >
              <AnimatePresence mode="wait">
                {objectives.length === 0 ? (
                  /* No objectives yet — show generate button */
                  <motion.div
                    key="empty"
                    className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-6 flex flex-col items-center gap-4 text-center"
                    variants={scaleIn}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                    style={{ willChange: 'transform' }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 mb-1">
                        Ready to generate your learning objectives?
                      </p>
                      <p className="text-xs text-slate-500">
                        Tell the AI about your course and it will craft measurable, role-based objectives.
                      </p>
                    </div>
                    <ul className="space-y-1.5 self-start w-full max-w-xs text-left">
                      {AI_CONTEXT_BULLETS.map((bullet) => (
                        <li key={bullet} className="flex items-center gap-2 text-xs text-slate-600">
                          <Check className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                    <motion.button
                      type="button"
                      onClick={() => setShowModal(true)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-indigo-700 transition-all"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      style={{ willChange: 'transform' }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Objectives
                    </motion.button>
                  </motion.div>
                ) : (
                  /* Objectives exist — show editable list */
                  <motion.div
                    key="has-objectives"
                    className="space-y-3"
                    variants={scaleIn}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                    style={{ willChange: 'transform' }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        {objectives.length} objective{objectives.length !== 1 ? 's' : ''} generated
                        <span className="ml-2 text-xs text-slate-400 font-normal">Click any to edit inline</span>
                      </p>
                    </div>
                    <EditableObjectivesList
                      objectives={objectives}
                      onChange={(next) => setWizardData({ objectives: next })}
                      onRegenerate={() => setShowModal(true)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal portal */}
      <AnimatePresence>
        {showModal && (
          <GenerateObjectivesModal
            onClose={() => setShowModal(false)}
            onGenerated={handleGenerated}
            courseTitle={courseTitle}
            courseDescription={wizardData.description}
            audience={audience}
            experienceLevel={wizardData.experienceLevel}
            sourceMaterials={sourceMaterials}
          />
        )}
      </AnimatePresence>
    </>
  )
}
