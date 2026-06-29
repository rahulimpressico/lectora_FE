import { useEffect, useState } from 'react'
import { Info, Sparkles, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCourseStore } from '../../../../store/courseStore'
import { useWizardNav } from '../WizardNavContext'
import { suggestCourseType } from '@/api/course-generation/api'
import { cn } from '@/lib/cn'

// ── Rule pack chip definitions ────────────────────────────────────────────────
// Mirrors the three rule packs registered in the backend (rule_packs.py).
// Each entry maps the display label used in courseTypeHint to the backend key.
const COURSE_TYPE_OPTIONS = [
  { key: 'insurance_ce',  label: 'Insurance CE'  },
  { key: 'iarce',         label: 'IARCE'          },
  { key: 'firm_element',  label: 'Firm Element'   },
] as const

type CourseTypeKey = (typeof COURSE_TYPE_OPTIONS)[number]['key']

// ── Other constants ───────────────────────────────────────────────────────────
const DURATION_OPTIONS = [1, 2, 3, 4, 5]
const DIFFICULTY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'basic',        label: 'Basic'        },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
]

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

// ── Component ─────────────────────────────────────────────────────────────────
export const CourseBasicsStep = () => {
  const courseTitle     = useCourseStore((s) => s.courseTitle)
  const setCourseTitle  = useCourseStore((s) => s.setCourseTitle)
  const courseId        = useCourseStore((s) => s.courseId)
  const setCourseId     = useCourseStore((s) => s.setCourseId)
  const courseTypeHint  = useCourseStore((s) => s.courseTypeHint)
  const setCourseTypeHint = useCourseStore((s) => s.setCourseTypeHint)
  const durationHours   = useCourseStore((s) => s.durationHours)
  const setDurationHours = useCourseStore((s) => s.setDurationHours)
  const difficultyLevel = useCourseStore((s) => s.difficultyLevel)
  const setDifficultyLevel = useCourseStore((s) => s.setDifficultyLevel)
  const setCourseTopic  = useCourseStore((s) => s.setCourseTopic)
  const setPhase        = useCourseStore((s) => s.setPhase)
  const wizardData      = useCourseStore((s) => s.wizardData)
  const setWizardData   = useCourseStore((s) => s.setWizardData)
  const audience        = useCourseStore((s) => s.audience)

  const description = wizardData.description ?? ''

  // Custom duration text — separate from pill selection so they don't fight each other
  const [customHours, setCustomHours]     = useState('')
  // AI suggestion state
  const [isSuggesting, setIsSuggesting]   = useState(false)
  const [suggestError, setSuggestError]   = useState<string | null>(null)
  // Feedback label shown after AI selects a chip
  const [aiSuggestedKey, setAiSuggestedKey] = useState<CourseTypeKey | null>(null)

  const handlePillDuration = (hrs: number) => {
    setDurationHours(durationHours === hrs ? null : hrs)
    setCustomHours('')
  }

  const handleCustomDuration = (val: string) => {
    setCustomHours(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0) {
      setDurationHours(n)
    } else {
      setDurationHours(null)
    }
  }

  const handleChipClick = (label: string) => {
    setCourseTypeHint(courseTypeHint === label ? '' : label)
    // Clear AI badge if user manually overrides
    setAiSuggestedKey(null)
    setSuggestError(null)
  }

  const handleSuggestCourseType = async () => {
    if (isSuggesting) return
    setSuggestError(null)
    setIsSuggesting(true)
    try {
      const result = await suggestCourseType({
        courseTitle:        courseTitle.trim() || undefined,
        courseDescription:  description.trim()  || undefined,
        targetAudience:     audience.trim()      || undefined,
        learningObjectives: wizardData.objectives.length > 0
          ? wizardData.objectives
          : undefined,
      })
      const matched = COURSE_TYPE_OPTIONS.find((o) => o.key === result.ruleFamily)
      if (matched) {
        setCourseTypeHint(matched.label)
        setAiSuggestedKey(matched.key)
      }
    } catch {
      setSuggestError('Could not get a suggestion. Try again or select manually.')
    } finally {
      setIsSuggesting(false)
    }
  }

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase:      'welcome',
      backLabel:      'Welcome',
      nextLabel:      'Next: Audience',
      isNextDisabled: !description.trim() || !courseTitle.trim() || !durationHours || !difficultyLevel || !courseTypeHint,
      onNext: () => {
        setCourseTopic(courseTitle.trim() || 'course')
        setPhase('wizard-audience')
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, courseTitle, durationHours, difficultyLevel, courseTypeHint])

  return (
    <motion.div
      className="space-y-5 sm:space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      style={{ willChange: "transform" }}
    >
      {/* Header */}
      <motion.div
        className="mb-8 sm:mb-10"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">
          Course Foundation
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">
          Let's build the foundation
        </h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">
          Define the essentials. The assistant uses this information to
          understand the course structure, tone, and scope.
        </p>
      </motion.div>

      {/* Course Title */}
      <motion.div className="space-y-1.5" variants={fadeUp} style={{ willChange: "transform" }}>
        <label className="block text-sm font-medium text-slate-700">
          Course Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={courseTitle}
          onChange={(e) => setCourseTitle(e.target.value)}
          placeholder="e.g. Washington LTC Compliance"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
        />
      </motion.div>

      {/* Course ID */}
      <motion.div className="space-y-1.5" variants={fadeUp} style={{ willChange: "transform" }}>
        <label className="block text-sm font-medium text-slate-700">
          Course ID
        </label>
        <input
          type="text"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          placeholder="e.g. CE-WA-2024-001"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
        />
      </motion.div>

      {/* Description */}
      <motion.div className="space-y-1.5" variants={fadeUp} style={{ willChange: "transform" }}>
        <label className="block text-sm font-medium text-slate-700">
          Course Description <span className="text-red-400">*</span>
        </label>
        <textarea
          rows={8}
          value={description}
          onChange={(e) => setWizardData({ description: e.target.value })}
          placeholder="What should this course cover?"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
        />
      </motion.div>

      {/* Course Type */}
      <motion.div className="space-y-2" variants={fadeUp} style={{ willChange: "transform" }}>
        {/* Label row: "Course Type *" + "Suggested by AI" button */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="block text-sm font-medium text-slate-700">
            Course Type <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={handleSuggestCourseType}
            disabled={isSuggesting}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all",
              isSuggesting
                ? "bg-indigo-50 text-indigo-400 border-indigo-200 cursor-not-allowed"
                : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400 shadow-xs cursor-pointer",
            )}
          >
            {isSuggesting
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Sparkles className="w-3 h-3" />
            }
            {isSuggesting ? 'Analysing…' : 'Suggested by AI'}
          </button>
        </div>

        {/* Chips — one per rule pack */}
        <div className="flex flex-wrap gap-2">
          {COURSE_TYPE_OPTIONS.map((opt) => {
            const isSelected = courseTypeHint === opt.label
            const isAiPick   = aiSuggestedKey === opt.key
            return (
              <div key={opt.key} className="relative">
                <motion.button
                  type="button"
                  onClick={() => handleChipClick(opt.label)}
                  whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{ willChange: "transform" }}
                  className={cn(
                    "px-4 py-2 text-sm rounded-full border transition-colors font-medium",
                    isSelected
                      ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-brand-300 shadow-xs",
                  )}
                >
                  {opt.label}
                </motion.button>
                {/* AI badge — shown on the chip the AI picked */}
                {isAiPick && isSelected && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex items-center gap-0.5 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow-sm pointer-events-none">
                    <Sparkles className="w-2 h-2" />
                    AI
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Error feedback */}
        {suggestError && (
          <p className="text-xs text-red-500 mt-1">{suggestError}</p>
        )}
      </motion.div>

      {/* Duration */}
      <motion.div className="space-y-1.5" variants={fadeUp} style={{ willChange: "transform" }}>
        <label className="block text-sm font-medium text-slate-700">
          Course Duration <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((hrs) => (
            <motion.button
              key={hrs}
              type="button"
              onClick={() => handlePillDuration(hrs)}
              whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ willChange: "transform" }}
              className={cn(
                "px-4 py-2 text-sm rounded-full border transition-colors font-medium",
                durationHours === hrs && customHours === ""
                  ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-brand-300 shadow-xs",
              )}
            >
              {hrs} {hrs === 1 ? "Hour" : "Hours"}
            </motion.button>
          ))}
        </div>
        {/* Custom duration text input */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={customHours}
            onChange={(e) => handleCustomDuration(e.target.value)}
            placeholder="Custom (e.g. 6)"
            className="w-36 px-3.5 py-2 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
          />
          <span className="text-sm text-slate-400">hours</span>
        </div>
      </motion.div>

      {/* Difficulty */}
      <motion.div className="space-y-1.5" variants={fadeUp} style={{ willChange: "transform" }}>
        <label className="block text-sm font-medium text-slate-700">
          Difficulty Level <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() =>
                setDifficultyLevel(
                  difficultyLevel === opt.value ? null : opt.value,
                )
              }
              whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ willChange: "transform" }}
              className={cn(
                "px-4 py-2 text-sm rounded-full border transition-colors font-medium",
                difficultyLevel === opt.value
                  ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-brand-300 shadow-xs",
              )}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Helper card */}
      <motion.div
        className="rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50/50 border border-brand-100 px-5 py-4 text-sm text-brand-700 flex items-start gap-3"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-400" />
        <span>
          Don't worry about perfection — everything can be edited later.
        </span>
      </motion.div>
    </motion.div>
  )
}
