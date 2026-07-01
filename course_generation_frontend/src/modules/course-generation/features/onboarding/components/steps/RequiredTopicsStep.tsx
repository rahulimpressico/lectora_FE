import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, AlertTriangle, BookOpen, CheckCircle2, ChevronDown, ChevronUp, Loader2, Pencil, RefreshCw, Sparkles, X } from 'lucide-react'
import { useCourseStore } from '../../../../store/courseStore'
import { useWizardNav } from '../WizardNavContext'
import { suggestRequiredTopics, type RTValidationIssue } from '@/api/course-generation/api'
import { cn } from '@/lib/cn'
import { DialogContent, DialogTitle } from '@/shared/components/Dialog'

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const chipVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 4 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 28 },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.15, ease: [0.55, 0, 1, 0.45] as const },
  },
}

// ── Regenerate prompt modal ───────────────────────────────────────────────────

interface RegeneratePromptModalProps {
  open: boolean
  onConfirm: (prompt: string) => void
  onClose: () => void
}

function RegeneratePromptModal({ open, onConfirm, onClose }: RegeneratePromptModalProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setValue('')
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [open])

  const handleSubmit = () => {
    onConfirm(value.trim())
    onClose()
  }

  return (
    <DialogContent open={open} onClose={onClose}>
      <motion.div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900">Regenerate Required Topics</DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">Optionally guide the AI — leave blank to regenerate as-is.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
          placeholder="e.g. Add more compliance topics, remove beginner concepts, focus on regulatory requirements..."
          className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
        />

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate
          </button>
        </div>
      </motion.div>
    </DialogContent>
  )
}

// ── Topic chip component ──────────────────────────────────────────────────────

interface TopicChipProps {
  topic: string
  onRemove: () => void
  onEdit: (newValue: string) => void
}

function TopicChip({ topic, onRemove, onEdit }: TopicChipProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(topic)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setEditValue(topic)
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 40)
  }

  const commitEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== topic) onEdit(trimmed)
    setIsEditing(false)
  }

  return (
    <motion.div
      variants={chipVariants}
      layout
      className={cn(
        'group flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors',
        isEditing
          ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
          : 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:border-indigo-400',
      )}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') setIsEditing(false)
          }}
          className="bg-transparent outline-none text-indigo-900 text-sm min-w-0 w-32"
          style={{ width: `${Math.max(editValue.length + 2, 8)}ch` }}
        />
      ) : (
        <span className="text-indigo-800">{topic}</span>
      )}

      {!isEditing && (
        <button
          type="button"
          onClick={startEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 hover:text-indigo-700 p-0.5 rounded"
          aria-label="Edit topic"
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-indigo-400 hover:text-red-500 transition-colors p-0.5 rounded"
        aria-label="Remove topic"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  )
}

// ── Main step ─────────────────────────────────────────────────────────────────

export const RequiredTopicsStep = () => {
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)
  const setPhase = useCourseStore((s) => s.setPhase)
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const courseTypeHint = useCourseStore((s) => s.courseTypeHint)
  const audience = useCourseStore((s) => s.audience)
  const durationHours = useCourseStore((s) => s.durationHours)
  const difficultyLevel = useCourseStore((s) => s.difficultyLevel)

  const requiredTopics: string[] = wizardData.requiredTopics ?? []

  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [validationPassed, setValidationPassed] = useState<boolean | null>(null)
  const [finalIssues, setFinalIssues] = useState<RTValidationIssue[]>([])
  const [showIssues, setShowIssues] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoGeneratedRef = useRef(false)

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-audience',
      backLabel: 'Back',
      nextLabel: 'Next: Source Material',
      isNextDisabled: requiredTopics.length === 0,
      onNext: () => setPhase('wizard-materials'),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredTopics.length])

  const buildInitialRequestBody = () => ({
    courseTitle: courseTitle || undefined,
    courseDescription: wizardData.description || undefined,
    courseType: courseTypeHint || undefined,
    courseDuration: durationHours != null ? `${durationHours} hour${durationHours !== 1 ? 's' : ''}` : undefined,
    targetAudience: audience || undefined,
    skillLevel: difficultyLevel || wizardData.experienceLevel || undefined,
    learnerOutcomes: wizardData.learnerOutcomes || undefined,
  })

  const buildRegenerationRequestBody = (regenerationPrompt: string) => ({
    regenerationPrompt,
    currentTopics: requiredTopics,
  })

  const hasSufficientData = !!(courseTitle || wizardData.description || audience)

  const generate = (replace: boolean, regenerationPrompt?: string) => {
    const isRegeneration = regenerationPrompt !== undefined
    if (!isRegeneration && !hasSufficientData) return
    if (isRegeneration && requiredTopics.length === 0) return
    setIsGenerating(true)
    setGenerateError(null)
    setValidationPassed(null)
    setFinalIssues([])
    setShowIssues(false)
    suggestRequiredTopics(
      isRegeneration
        ? buildRegenerationRequestBody(regenerationPrompt)
        : buildInitialRequestBody(),
    )
      .then((result) => {
        setValidationPassed(result.validationPassed)
        setFinalIssues(result.finalIssues ?? [])
        if (result.requiredTopics.length > 0) {
          if (replace) {
            setWizardData({ requiredTopics: result.requiredTopics })
          } else {
            // Merge: append only topics not already present (case-insensitive)
            const existing = new Set(requiredTopics.map((t) => t.toLowerCase()))
            const fresh = result.requiredTopics.filter((t) => !existing.has(t.toLowerCase()))
            setWizardData({ requiredTopics: [...requiredTopics, ...fresh] })
          }
        }
      })
      .catch((err: unknown) => {
        setGenerateError(err instanceof Error ? err.message : 'Suggestion failed. Please try again.')
      })
      .finally(() => setIsGenerating(false))
  }

  // Auto-generate on first visit when topic list is empty
  useEffect(() => {
    if (autoGeneratedRef.current) return
    if (requiredTopics.length > 0) {
      // Topics already exist (persisted from a previous visit) — skip generation
      autoGeneratedRef.current = true
      return
    }
    if (!hasSufficientData) return
    autoGeneratedRef.current = true
    generate(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addTopic = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || requiredTopics.includes(trimmed)) {
      setInputValue('')
      return
    }
    setWizardData({ requiredTopics: [...requiredTopics, trimmed] })
    setInputValue('')
  }

  const removeTopic = (index: number) => {
    setWizardData({ requiredTopics: requiredTopics.filter((_, i) => i !== index) })
  }

  const editTopic = (index: number, newValue: string) => {
    const next = [...requiredTopics]
    next[index] = newValue
    setWizardData({ requiredTopics: next })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTopic()
    }
  }

  return (
    <motion.div
      className="space-y-5 sm:space-y-6"
      variants={staggerContainer}
      initial={false}
      animate="show"
    >
      {/* Header */}
      <motion.div className="mb-8 sm:mb-10" variants={fadeUp} style={{ willChange: 'transform' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">
          Course Content <span className="text-red-400 normal-case text-[10px]">*</span>
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">
          What topics must this course cover?
        </h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">
          Add the required topics that every learner must encounter. These topics
          will be treated as high-priority content throughout course generation.
        </p>
      </motion.div>

      {/* Input row */}
      <motion.div className="space-y-2" variants={fadeUp} style={{ willChange: 'transform' }}>
        <label className="block text-sm font-medium text-slate-700">
          Required Topics <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. COBRA continuation rights — press Enter to add"
            autoFocus
            className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
          />
          <motion.button
            type="button"
            onClick={addTopic}
            disabled={!inputValue.trim()}
            whileHover={inputValue.trim() ? { scale: 1.04 } : {}}
            whileTap={inputValue.trim() ? { scale: 0.96 } : {}}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </motion.button>
        </div>
        <p className="text-xs text-slate-400">Press Enter or click Add to create a topic chip.</p>
      </motion.div>

      {/* Chip cloud + loading/error */}
      <motion.div variants={fadeUp} style={{ willChange: 'transform' }}>
        <AnimatePresence mode="popLayout">
          {isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-10 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 text-center"
            >
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-indigo-700">Analysing course data and suggesting topics…</p>
              <p className="text-xs text-slate-400 max-w-xs">
                The AI is reviewing your course title, description, and audience to recommend the topics that matter most.
              </p>
            </motion.div>
          ) : generateError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-700">Could not generate suggestions</p>
                <p className="text-xs text-red-500 mt-0.5">{generateError}</p>
              </div>
              <button
                type="button"
                onClick={() => { setGenerateError(null); generate(true) }}
                className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-800 underline"
              >
                Retry
              </button>
            </motion.div>
          ) : requiredTopics.length > 0 ? (
            <motion.div
              key="chips"
              className="flex flex-wrap gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50 min-h-[64px]"
            >
              <AnimatePresence mode="popLayout">
                {requiredTopics.map((topic, i) => (
                  <TopicChip
                    key={`${topic}-${i}`}
                    topic={topic}
                    onRemove={() => removeTopic(i)}
                    onEdit={(val) => editTopic(i, val)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-8 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-400 font-medium">
                No topics added yet. Type above and press Enter.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Regenerate prompt modal */}
      <RegeneratePromptModal
        open={showRegenerateModal}
        onConfirm={(prompt) => generate(true, prompt)}
        onClose={() => setShowRegenerateModal(false)}
      />

      {/* AI action row */}
      <motion.div className="flex items-center gap-2 flex-wrap" variants={fadeUp} style={{ willChange: 'transform' }}>
        {requiredTopics.length > 0 ? (
          <motion.button
            type="button"
            onClick={() => setShowRegenerateModal(true)}
            disabled={isGenerating || !hasSufficientData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={isGenerating ? {} : { scale: 1.02 }}
            whileTap={isGenerating ? {} : { scale: 0.98 }}
          >
            <RefreshCw className={cn('w-3 h-3', isGenerating && 'animate-spin')} />
            Regenerate suggestions
          </motion.button>
        ) : !isGenerating && hasSufficientData && !generateError ? (
          <motion.button
            type="button"
            onClick={() => generate(true)}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles className="w-3 h-3" />
            Suggest topics with AI
          </motion.button>
        ) : null}

        {/* AI quality badge — shown after generation completes */}
        <AnimatePresence>
          {!isGenerating && validationPassed !== null && requiredTopics.length > 0 && (
            <motion.span
              key="quality-badge"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                validationPassed
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200',
              )}
            >
              {validationPassed ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              {validationPassed ? 'AI quality check passed' : 'Suggestions need review'}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* AI quality issues panel — shown when validation did not fully pass */}
      <AnimatePresence>
        {!isGenerating && !validationPassed && finalIssues.length > 0 && (
          <motion.div
            key="quality-issues"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowIssues((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100/60 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {finalIssues.length} quality {finalIssues.length === 1 ? 'note' : 'notes'} from AI review
                </span>
                {showIssues ? (
                  <ChevronUp className="w-4 h-4 text-amber-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-amber-600" />
                )}
              </button>

              <AnimatePresence>
                {showIssues && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-4 pb-4 space-y-3"
                  >
                    <p className="text-xs text-amber-700">
                      These are AI quality signals — you can still proceed. Review or edit the topics above to address them.
                    </p>
                    {finalIssues.map((issue, i) => (
                      <div key={i} className="rounded-lg border border-amber-200 bg-white p-3 space-y-1">
                        <p className="text-xs font-semibold text-amber-800">{issue.message}</p>
                        {issue.affectedTopics.length > 0 && (
                          <p className="text-xs text-amber-600">
                            Affected: {issue.affectedTopics.join(', ')}
                          </p>
                        )}
                        {issue.expectedAction && (
                          <p className="text-xs text-slate-500 italic">{issue.expectedAction}</p>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation hint */}
      <AnimatePresence>
        {requiredTopics.length === 0 && !isGenerating && (
          <motion.p
            key="validation-hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="text-xs font-medium text-amber-600 flex items-center gap-1.5"
          >
            <span className="w-1 h-1 rounded-full bg-amber-500 inline-block" />
            At least one required topic is needed to continue.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Helper note */}
      <motion.div
        className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50/50 border border-indigo-100 px-5 py-4 text-sm text-indigo-700 flex items-start gap-3"
        variants={fadeUp}
        style={{ willChange: 'transform' }}
      >
        <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
        <span>
          Required topics are given <strong>highest priority</strong> during TO and content generation.
          Add any regulatory mandates, key concepts, or must-cover compliance areas here.
        </span>
      </motion.div>
    </motion.div>
  )
}
