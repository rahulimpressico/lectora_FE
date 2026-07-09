import { useCallback, useEffect, useRef, useState, type ClipboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, CheckCircle2, ClipboardList, Loader2, Plus, RefreshCw, Sparkles, Trash2, List, X } from 'lucide-react'
import { useCourseStore } from '../../store'
import { useWizardNav } from '../../components/WizardNavContext'
import { generateLearningObjectives, regenerateLearningObjectives } from '../api'
import { cn } from '@/lib/cn'
import { DialogContent, DialogTitle } from '@/shared/components/Dialog'
import {
  parseNaturalLanguageObjectives,
  pastedTextLooksLikeMultipleObjectives,
} from '@/modules/course-generation/utils/parseNaturalLanguageObjectives'
import { fadeUp, fadeIn, scaleIn, staggerContainer } from '../../constants/animations'
import { modeCardVariant, objectiveRowVariant, AI_CONTEXT_BULLETS } from '../constants'
import type {
  RegeneratePromptModalProps,
  RegeneratePromptModalFormProps,
  EditableObjectivesListProps,
} from '../types'

// ─── Regenerate Prompt Modal ──────────────────────────────────────────────────

function RegeneratePromptModalForm({ onConfirm, onClose }: RegeneratePromptModalFormProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => textareaRef.current?.focus(), 80)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const handleSubmit = () => {
    onConfirm(value.trim())
    onClose()
  }

  return (
    <motion.div
      className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <DialogTitle className="text-base font-bold text-slate-900">Regenerate Learning Objectives</DialogTitle>
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
        placeholder="e.g. Make it more advanced, focus on practical skills, add security concepts..."
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
  )
}

function RegeneratePromptModal({ open, onConfirm, onClose }: RegeneratePromptModalProps) {
  return (
    <DialogContent open={open} onClose={onClose}>
      {open ? <RegeneratePromptModalForm onConfirm={onConfirm} onClose={onClose} /> : null}
    </DialogContent>
  )
}

// ─── Editable Objectives List ─────────────────────────────────────────────────

function EditableObjectivesList({ objectives, onChange, onRegenerate, isRegenerating = false }: EditableObjectivesListProps) {
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
    const parsed = parseNaturalLanguageObjectives(trimmed)
    onChange([...objectives, ...parsed])
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
      <div className="flex items-start gap-2 pt-1">
        <textarea
          rows={2}
          value={newObjective}
          onChange={(e) => setNewObjective(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addObjective() } }}
          placeholder="Add a custom objective..."
          className="flex-1 px-3 py-2.5 text-sm border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none"
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
      {onRegenerate && (
      <motion.button
        type="button"
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="flex items-center gap-2 w-full justify-center py-2.5 px-4 border border-dashed border-indigo-200 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        whileHover={isRegenerating ? {} : { scale: 1.03 }}
        whileTap={isRegenerating ? {} : { scale: 0.97 }}
        style={{ willChange: 'transform' }}
      >
        {isRegenerating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        {isRegenerating ? 'Regenerating...' : 'Regenerate Objectives'}
      </motion.button>
      )}
    </div>
  )
}

// ─── Main Step ────────────────────────────────────────────────────────────────

export const LearningObjectivesStep = () => {
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)
  const sourceAnalyses = useCourseStore((s) => s.sourceAnalyses)
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const audience = useCourseStore((s) => s.audience)
  const courseTypeHint = useCourseStore((s) => s.courseTypeHint)
  const durationHours = useCourseStore((s) => s.durationHours)
  const difficultyLevel = useCourseStore((s) => s.difficultyLevel)
  const rawDocuments = useCourseStore((s) => s.rawDocuments)

  const objectivesMode = wizardData.objectivesMode ?? 'ai-generated'
  const objectives = wizardData.objectives ?? []

  const [naturalText, setNaturalText] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false)

  const appendParsedObjectives = useCallback((text: string) => {
    const parsed = parseNaturalLanguageObjectives(text)
    if (parsed.length === 0) return
    const current = useCourseStore.getState().wizardData.objectives ?? []
    setWizardData({ objectives: [...current, ...parsed] })
    setNaturalText('')
  }, [setWizardData])

  const handleNaturalTextPaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text/plain')
    if (!pasted.trim() || !pastedTextLooksLikeMultipleObjectives(pasted)) return

    e.preventDefault()
    const textarea = e.currentTarget
    const { selectionStart, selectionEnd } = textarea
    const combined = `${naturalText.slice(0, selectionStart)}${pasted}${naturalText.slice(selectionEnd)}`
    appendParsedObjectives(combined)
  }, [appendParsedObjectives, naturalText])

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
      isNextDisabled: objectives.length === 0,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectivesMode, objectives.length])

  const courseDuration = durationHours != null ? `${durationHours} hour${durationHours !== 1 ? 's' : ''}` : undefined
  const skillLevel = difficultyLevel || wizardData.experienceLevel || undefined

  const handleGenerate = () => {
    setIsGenerating(true)

    // Source analyses were computed on the Materials step and cached in the store.
    // Use them directly — no analyzeSource call here.
    generateLearningObjectives({
      sourceMaterials,
      courseTitle: courseTitle || undefined,
      courseDescription: wizardData.description || undefined,
      courseType: courseTypeHint || undefined,
      courseDuration,
      skillLevel,
      targetAudience: audience || undefined,
      sourceAnalyses: sourceAnalyses.length > 0 ? sourceAnalyses : undefined,
      requiredTopics: wizardData.requiredTopics?.length > 0 ? wizardData.requiredTopics : undefined,
    })
      .then((result) => {
        setWizardData({ objectives: result.learningObjectives })
      })
      .catch((err: unknown) => {
        console.error('[LearningObjectivesStep] generateLearningObjectives failed:', err)
      })
      .finally(() => {
        setIsGenerating(false)
      })
  }

  const handleRegenerate = (regenerationPrompt: string) => {
    if (objectives.length === 0) {
      handleGenerate()
      return
    }

    setIsGenerating(true)

    regenerateLearningObjectives({
      currentObjectives: objectives,
      regenerationPrompt,
      courseTitle: courseTitle || undefined,
      courseType: courseTypeHint || undefined,
      courseDuration,
      skillLevel,
      targetAudience: audience || undefined,
    })
      .then((result) => {
        setWizardData({ objectives: result.learningObjectives })
      })
      .catch((err: unknown) => {
        console.error('[LearningObjectivesStep] regenerateLearningObjectives failed:', err)
      })
      .finally(() => {
        setIsGenerating(false)
      })
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
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Paste your learning objectives</label>
                <textarea
                  rows={8}
                  value={naturalText}
                  onChange={(e) => setNaturalText(e.target.value)}
                  onPaste={handleNaturalTextPaste}
                  placeholder="e.g. After completing this course, learners will understand LTC insurance fundamentals, identify policy types and riders, apply regulatory requirements to client scenarios, and demonstrate ethical sales practices."
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">Paste one objective per line, or use numbered lists, bullets, or semicolons.</p>
                  <motion.button
                    type="button"
                    onClick={() => appendParsedObjectives(naturalText)}
                    disabled={!naturalText.trim()}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    whileHover={naturalText.trim() ? { scale: 1.02 } : {}}
                    whileTap={naturalText.trim() ? { scale: 0.97 } : {}}
                  >
                    <List className="w-3.5 h-3.5" />
                    Parse Objectives
                  </motion.button>
                </div>
              </div>

              {objectives.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-slate-500">
                    {objectives.length} objective{objectives.length !== 1 ? 's' : ''} added
                    <span className="ml-2 font-normal">Click any to edit, or paste more above</span>
                  </p>
                  <EditableObjectivesList
                    objectives={objectives}
                    onChange={(next) => setWizardData({ objectives: next })}
                  />
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
                      onClick={() => handleGenerate()}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={isGenerating ? {} : { scale: 1.03 }}
                      whileTap={isGenerating ? {} : { scale: 0.97 }}
                      style={{ willChange: 'transform' }}
                    >
                      {isGenerating ? (
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
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">
                        {objectives.length} objective{objectives.length !== 1 ? 's' : ''} generated
                        <span className="ml-2 text-xs text-slate-400 font-normal">Click any to edit inline</span>
                      </p>
                    </div>
                    <EditableObjectivesList
                      objectives={objectives}
                      onChange={(next) => setWizardData({ objectives: next })}
                      onRegenerate={() => setIsRegenerateModalOpen(true)}
                      isRegenerating={isGenerating}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
    </motion.div>

    <RegeneratePromptModal
      open={isRegenerateModalOpen}
      onClose={() => setIsRegenerateModalOpen(false)}
      onConfirm={(prompt) => (prompt.trim() ? handleRegenerate(prompt.trim()) : handleGenerate())}
    />
    </>
  )
}
