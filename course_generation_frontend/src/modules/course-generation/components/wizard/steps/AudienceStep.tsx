import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Award, BookOpen, GraduationCap } from 'lucide-react'
import { useCourseStore } from '../../../store/courseStore'
import { useWizardNav } from '../WizardNavContext'
import { cn } from '@/lib/cn'
import type { WizardData } from '../../../types/wizard'

const AUDIENCE_PILLS = [
  'Financial Advisors',
  'Insurance Agents',
  'Compliance Officers',
  'New Employees',
  'All Staff',
]

interface ExperienceCard {
  value: WizardData['experienceLevel']
  label: string
  description: string
  icon: ReactNode
}

const EXPERIENCE_CARDS: ExperienceCard[] = [
  {
    value: 'new',
    label: 'New to Topic',
    description: 'Little to no prior knowledge',
    icon: <GraduationCap className="w-5 h-5" />,
  },
  {
    value: 'some',
    label: 'Some Experience',
    description: 'Familiar with core concepts',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    value: 'experienced',
    label: 'Experienced',
    description: 'Strong existing knowledge',
    icon: <Award className="w-5 h-5" />,
  },
]

export const AudienceStep = () => {
  const audience = useCourseStore((s) => s.audience)
  const setAudience = useCourseStore((s) => s.setAudience)
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)

  const experienceLevel = wizardData.experienceLevel ?? ''
  const learnerOutcomes = wizardData.learnerOutcomes ?? ''
  const audienceNotes = wizardData.audienceNotes ?? ''

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-basics',
      backLabel: 'Back',
      nextPhase: 'wizard-materials',
      nextLabel: 'Next: Source Material',
      isNextDisabled: !audience.trim(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience])

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Target Learners</p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">Who are you teaching?</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">Understanding your learners shapes every word, example, and assessment in the course.</p>
      </div>

      {/* Target Audience */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Target Audience <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g. Licensed insurance agents in Washington State"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all mb-2"
        />
        <div className="flex flex-wrap gap-2">
          {AUDIENCE_PILLS.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => setAudience(pill)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-all',
                audience === pill
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600',
              )}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Experience Level */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Learner Experience Level
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {EXPERIENCE_CARDS.map((card) => (
            <button
              key={card.value}
              type="button"
              onClick={() => setWizardData({ experienceLevel: card.value })}
              className={cn(
                'flex flex-col items-start gap-2 p-4 rounded-xl cursor-pointer transition-all text-left',
                experienceLevel === card.value
                  ? 'border-2 border-brand-500 bg-brand-50 shadow-sm'
                  : 'border border-slate-200/80 bg-white/80 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/30 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  experienceLevel === card.value ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
                )}
              >
                {card.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{card.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Learner Outcomes */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Learner Outcomes
        </label>
        <textarea
          rows={3}
          value={learnerOutcomes}
          onChange={(e) => setWizardData({ learnerOutcomes: e.target.value })}
          placeholder="What should learners be able to do after this course?"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
        />
      </div>

      {/* Audience Notes */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Special Audience Notes
          <span className="text-slate-400 font-normal ml-1">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={audienceNotes}
          onChange={(e) => setWizardData({ audienceNotes: e.target.value })}
          placeholder="Any special considerations about your audience..."
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
        />
      </div>
    </div>
  )
}
