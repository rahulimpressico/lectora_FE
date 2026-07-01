import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, BookOpen, GraduationCap } from 'lucide-react'
import { useCourseStore } from '../../../../store/courseStore'
import { useWizardNav } from '../WizardNavContext'
import { cn } from '@/lib/cn'
import type { WizardData } from '../../../../types/wizard'

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

// --- Animation variants ---

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const pillVariant = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
}

export const AudienceStep = () => {
  const audience = useCourseStore((s) => s.audience)
  const setAudience = useCourseStore((s) => s.setAudience)
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)

  const experienceLevel = wizardData.experienceLevel ?? ''
  const learnerOutcomes = wizardData.learnerOutcomes ?? ''
  const selectedAudiences = wizardData.selectedAudiences ?? []

  const toggleAudiencePill = (pill: string) => {
    const next = selectedAudiences.includes(pill)
      ? selectedAudiences.filter((a) => a !== pill)
      : [...selectedAudiences, pill]
    setWizardData({ selectedAudiences: next })
    setAudience(next.join(', '))
  }

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-basics',
      backLabel: 'Back',
      nextPhase: 'wizard-required-topics',
      nextLabel: 'Next: Required Topics',
      isNextDisabled: !audience.trim() || !experienceLevel,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, experienceLevel])

  return (
    <motion.div
      className="space-y-5 sm:space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div className="mb-8 sm:mb-10" variants={fadeUp} style={{ willChange: 'transform' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Target Learners</p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">Who are you teaching?</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">Understanding your learners shapes every word, example, and assessment in the course.</p>
      </motion.div>

      {/* Target Audience */}
      <motion.div className="space-y-1.5" variants={fadeUp} style={{ willChange: 'transform' }}>
        <label className="block text-sm font-medium text-slate-700">
          Target Audience <span className="text-red-400">*</span>
        </label>
        {/* Multi-select pills */}
        <motion.div className="flex flex-wrap gap-2 mb-2" variants={staggerContainer}>
          <AnimatePresence>
            {AUDIENCE_PILLS.map((pill) => {
              const isSelected = selectedAudiences.includes(pill)
              return (
                <motion.button
                  key={pill}
                  type="button"
                  onClick={() => toggleAudiencePill(pill)}
                  variants={pillVariant}
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ willChange: 'transform' }}
                  className={cn(
                    'px-3 py-1 text-xs rounded-full border transition-colors font-medium',
                    isSelected
                      ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600',
                  )}
                >
                  {isSelected && <span className="mr-1">✓</span>}
                  {pill}
                </motion.button>
              )
            })}
          </AnimatePresence>
        </motion.div>
        {/* Free-text override / custom entry */}
        <input
          type="text"
          value={audience}
          onChange={(e) => {
            setAudience(e.target.value)
            setWizardData({ selectedAudiences: [] })
          }}
          placeholder="Or describe your audience… e.g. Licensed insurance agents in Washington State"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
        />
      </motion.div>

      {/* Experience Level */}
      <motion.div className="space-y-1.5" variants={fadeUp} style={{ willChange: 'transform' }}>
        <label className="block text-sm font-medium text-slate-700">
          Learner Experience Level <span className="text-red-400">*</span>
        </label>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          variants={staggerContainer}
        >
          {EXPERIENCE_CARDS.map((card) => {
            const isSelected = experienceLevel === card.value
            return (
              <motion.button
                key={card.value}
                type="button"
                onClick={() => setWizardData({ experienceLevel: card.value })}
                variants={scaleIn}
                animate={isSelected ? { scale: 1.02 } : { scale: 1 }}
                whileHover={{ y: -2, scale: isSelected ? 1.02 : 1.01 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{ willChange: 'transform' }}
                className={cn(
                  'flex flex-col items-start gap-2 p-4 rounded-xl cursor-pointer text-left',
                  isSelected
                    ? 'border-2 border-brand-500 bg-brand-50 shadow-sm'
                    : 'border border-slate-200/80 bg-white/80 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-md',
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-lg transition-colors duration-150',
                    isSelected ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {card.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{card.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{card.description}</p>
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </motion.div>

      {/* Learner Outcomes */}
      <motion.div className="space-y-1.5" variants={fadeUp} style={{ willChange: 'transform' }}>
        <label className="block text-sm font-medium text-slate-700">
          Learner Outcomes
        </label>
        <textarea
          rows={5}
          value={learnerOutcomes}
          onChange={(e) => setWizardData({ learnerOutcomes: e.target.value })}
          placeholder="What should learners be able to do after completing this course?"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
        />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="font-medium text-slate-500">Examples: </span>
          Identify benefit triggers and eligibility criteria · Compare policy types and cost structures · Apply suitability analysis to client scenarios · Explain regulatory requirements and disclosure obligations
        </p>
      </motion.div>
    </motion.div>
  )
}
