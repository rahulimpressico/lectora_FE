import { useEffect } from 'react'
import { Info } from 'lucide-react'
import { useCourseStore } from '../../../store/courseStore'
import { useWizardNav } from '../WizardNavContext'
import { cn } from '@/lib/cn'

const COURSE_TYPE_PILLS = ['Insurance CE', 'Firm Element', 'Product Training', 'Compliance Training']
const DURATION_OPTIONS = [1, 2, 3, 4, 5]
const DIFFICULTY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

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
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Course Foundation</p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">Let's build the foundation</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">Define the essentials. The assistant uses this information to understand the course structure, tone, and scope.</p>
      </div>

      {/* Course Title */}
      <div className="space-y-1.5">
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
      </div>

      {/* Course ID */}
      <div className="space-y-1.5">
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
      </div>

      {/* Description */}
      <div className="space-y-1.5">
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
      </div>

      {/* Course Type */}
      <div className="space-y-1.5">
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
            <button
              key={pill}
              type="button"
              onClick={() => setCourseTypeHint(pill)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-all',
                courseTypeHint === pill
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600',
              )}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Course Duration
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((hrs) => (
            <button
              key={hrs}
              type="button"
              onClick={() => setDurationHours(durationHours === hrs ? null : hrs)}
              className={cn(
                'px-4 py-2 text-sm rounded-full border transition-all font-medium',
                durationHours === hrs
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:shadow-sm shadow-xs',
              )}
            >
              {hrs} {hrs === 1 ? 'Hour' : 'Hours'}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Difficulty Level
        </label>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDifficultyLevel(difficultyLevel === opt.value ? null : opt.value)}
              className={cn(
                'px-4 py-2 text-sm rounded-full border transition-all font-medium',
                difficultyLevel === opt.value
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:shadow-sm shadow-xs',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Helper card */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50/50 border border-brand-100 px-5 py-4 text-sm text-brand-700 flex items-start gap-3">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-400" />
        <span>Don't worry about perfection — everything can be edited later.</span>
      </div>
    </div>
  )
}
