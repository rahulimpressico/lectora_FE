import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Pencil, X } from 'lucide-react'
import { useCourseStore } from '../../../../store/courseStore'
import { useWizardNav } from '../WizardNavContext'
import { cn } from '@/lib/cn'

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

  const requiredTopics: string[] = wizardData.requiredTopics ?? []

  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-basics',
      backLabel: 'Back',
      nextLabel: 'Next: Audience',
      isNextDisabled: requiredTopics.length === 0,
      onNext: () => setPhase('wizard-audience'),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredTopics.length])

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
      initial="hidden"
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

      {/* Input */}
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
            className="flex-1 px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
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

      {/* Chip cloud */}
      <motion.div variants={fadeUp} style={{ willChange: 'transform' }}>
        <AnimatePresence mode="popLayout">
          {requiredTopics.length > 0 ? (
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

      {/* Validation hint */}
      <AnimatePresence>
        {requiredTopics.length === 0 && (
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
