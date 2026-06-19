import { useEffect } from 'react'
import { Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCourseStore } from '../../../../store/courseStore'
import { useWizardNav } from '../WizardNavContext'
import { cn } from '@/lib/cn'

const COURSE_TYPE_PILLS = ['Insurance CE', 'Firm Element', 'Product Training', 'Compliance Training']
const DURATION_OPTIONS = [1, 2, 3, 4, 5]
const DIFFICULTY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

// ── Animation variants ──────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

// ── Component ────────────────────────────────────────────────────────────────

export const CourseBasicsStep = () => {
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const setCourseTitle = useCourseStore((s) => s.setCourseTitle)
  const courseId = useCourseStore((s) => s.courseId)
  const setCourseId = useCourseStore((s) => s.setCourseId)
  const courseTypeHint = useCourseStore((s) => s.courseTypeHint)
  const setCourseTypeHint = useCourseStore((s) => s.setCourseTypeHint)
  const durationHours = useCourseStore((s) => s.durationHours)
  const setDurationHours = useCourseStore((s) => s.setDurationHours)
  const difficultyLevel = useCourseStore((s) => s.difficultyLevel)
  const setDifficultyLevel = useCourseStore((s) => s.setDifficultyLevel)
  const setCourseTopic = useCourseStore((s) => s.setCourseTopic)
  const setPhase = useCourseStore((s) => s.setPhase)
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)

  const description = wizardData.description ?? ''

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'welcome',
      backLabel: 'Welcome',
      nextLabel: 'Next: Audience',
      isNextDisabled: !description.trim(),
      onNext: () => {
        setCourseTopic(courseTitle.trim() || 'course')
        setPhase('wizard-audience')
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, courseTitle])

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
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Course Title
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
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
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
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Course Description <span className="text-red-400">*</span>
        </label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setWizardData({ description: e.target.value })}
          placeholder="What should this course cover?"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
        />
      </motion.div>

      {/* Course Type */}
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Course Type
        </label>
        <input
          type="text"
          value={courseTypeHint}
          onChange={(e) => setCourseTypeHint(e.target.value)}
          placeholder="e.g. Insurance CE"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all mb-2"
        />
        <div className="flex flex-wrap gap-2">
          {COURSE_TYPE_PILLS.map((pill) => (
            <motion.button
              key={pill}
              type="button"
              onClick={() => setCourseTypeHint(pill)}
              whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ willChange: "transform" }}
              className={cn(
                "px-3 py-1 text-xs rounded-full border transition-colors",
                courseTypeHint === pill
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600",
              )}
            >
              {pill}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Duration */}
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Course Duration
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((hrs) => (
            <motion.button
              key={hrs}
              type="button"
              onClick={() =>
                setDurationHours(durationHours === hrs ? null : hrs)
              }
              whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ willChange: "transform" }}
              className={cn(
                "px-4 py-2 text-sm rounded-full border transition-colors font-medium",
                durationHours === hrs
                  ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-brand-300 shadow-xs",
              )}
            >
              {hrs} {hrs === 1 ? "Hour" : "Hours"}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Difficulty */}
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Difficulty Level
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
  );
}
