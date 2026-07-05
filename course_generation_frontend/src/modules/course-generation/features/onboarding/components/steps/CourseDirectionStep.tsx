import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { BarChart2, FileText, Layers } from 'lucide-react'
import { useCourseStore } from '../../../../store/courseStore'
import { useWizardNav } from '../WizardNavContext'
import { cn } from '@/lib/cn'
import type { WizardData } from '../../../../types/wizard'

const TONE_PILLS = ['Practical', 'Formal', 'Conversational', 'Compliance-Focused']

interface DepthCard {
  value: WizardData['depth']
  label: string
  description: string
  icon: ReactNode
}

const DEPTH_CARDS: DepthCard[] = [
  {
    value: 'overview',
    label: 'Overview',
    description: 'High-level concepts, concise',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Equal depth and breadth',
    icon: <BarChart2 className="w-5 h-5" />,
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Comprehensive, in-depth coverage',
    icon: <FileText className="w-5 h-5" />,
  },
]

// Cubic-bezier tuples typed as const tuples so framer-motion accepts them
const EASE_ENTRY = [0.22, 1, 0.36, 1] as [number, number, number, number]

// --- Animation variants ---
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_ENTRY },
  },
}

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
}

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: EASE_ENTRY },
  },
}

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
}

// --- ToggleSwitch with animated thumb ---
interface ToggleSwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
}

const ToggleSwitch = ({ checked, onChange, label, description }: ToggleSwitchProps) => (
  <motion.div
    variants={fadeUp}
    className="flex items-start justify-between gap-4 p-4 bg-white border border-border rounded-xl"
    style={{ willChange: 'transform' }}
  >
    <div>
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.92 }}
      className={cn(
        'shrink-0 relative inline-flex w-9 h-5 rounded-full focus:outline-none',
        checked ? 'bg-brand-500' : 'bg-slate-200',
      )}
      style={{ willChange: 'transform' }}
      animate={{ backgroundColor: checked ? 'var(--color-brand-500, #6366f1)' : '#e2e8f0' }}
      transition={{ duration: 0.15 }}
    >
      <motion.span
        className="inline-block w-4 h-4 rounded-full bg-white shadow mt-0.5"
        style={{ willChange: 'transform' }}
        animate={{ x: checked ? 16 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  </motion.div>
)

// --- Depth card with selection pulse ---
interface DepthCardButtonProps {
  card: DepthCard
  isSelected: boolean
  onSelect: () => void
}

const DepthCardButton = ({ card, isSelected, onSelect }: DepthCardButtonProps) => {
  return (
    <motion.button
      key={card.value}
      type="button"
      onClick={onSelect}
      variants={scaleIn}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      animate={isSelected ? { scale: [1.04, 1] } : { scale: 1 }}
      transition={
        isSelected
          ? { duration: 0.25, ease: EASE_ENTRY }
          : { type: 'spring', stiffness: 400, damping: 30 }
      }
      className={cn(
        'flex flex-col items-start gap-2 p-4 rounded-xl cursor-pointer text-left',
        isSelected
          ? 'border-2 border-brand-500 bg-brand-50 shadow-sm'
          : 'border border-slate-200/80 bg-white/80 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-md',
      )}
      style={{ willChange: 'transform' }}
    >
      <div
        className={cn(
          'p-2 rounded-lg',
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
}

export const CourseDirectionStep = () => {
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)

  const tone = wizardData.tone ?? ''
  const depth = wizardData.depth ?? 'balanced'
  const emphasis = wizardData.emphasis ?? ''
  const avoid = wizardData.avoid ?? ''
  const includeCaseStudies = wizardData.includeCaseStudies ?? true
  const includeExamples = wizardData.includeExamples ?? true
  const includeKnowledgeChecks = wizardData.includeKnowledgeChecks ?? true

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-objectives',
      backLabel: 'Back',
      nextPhase: 'wizard-outline-pref',
      nextLabel: 'Next: Course Structure',
      isNextDisabled: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      className="space-y-5 sm:space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div
        className="mb-8 sm:mb-10"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">
          Course Style
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">
          How should this course feel?
        </h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">
          Set the tone, depth, and emphasis. This helps the assistant prepare a
          draft that matches your writing expectations.
        </p>
      </motion.div>

      {/* Section divider: Course Tone */}
      <motion.div className="space-y-1.5" variants={fadeIn}>
        <label className="block text-sm font-medium text-slate-700">
          Course Tone
        </label>
        <motion.input
          type="text"
          value={tone}
          onChange={(e) => setWizardData({ tone: e.target.value })}
          placeholder="e.g. Practical and direct"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all mb-2"
          variants={fadeUp}
          style={{ willChange: "transform" }}
        />
        <motion.div
          className="flex flex-wrap gap-2"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {TONE_PILLS.map((pill) => (
            <motion.button
              key={pill}
              type="button"
              onClick={() => setWizardData({ tone: pill })}
              variants={scaleIn}
              whileHover={{ y: -1, scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              animate={tone === pill ? { scale: [1.06, 1] } : { scale: 1 }}
              transition={
                tone === pill
                  ? { duration: 0.2, ease: EASE_ENTRY }
                  : { type: "spring", stiffness: 400, damping: 30 }
              }
              className={cn(
                "px-3 py-1 text-xs rounded-full border",
                tone === pill
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600",
              )}
              style={{ willChange: "transform" }}
            >
              {pill}
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* Course Depth */}
      <motion.div className="space-y-1.5" variants={fadeIn}>
        <label className="block text-sm font-medium text-slate-700">
          Course Depth
        </label>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {DEPTH_CARDS.map((card) => (
            <DepthCardButton
              key={card.value}
              card={card}
              isSelected={depth === card.value}
              onSelect={() => setWizardData({ depth: card.value })}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Emphasis */}
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          What should the course emphasize?
        </label>
        <motion.textarea
          rows={5}
          value={emphasis}
          onChange={(e) => setWizardData({ emphasis: e.target.value })}
          placeholder="e.g. Focus on real-world agent responsibilities and employer decision-making."
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
          variants={fadeUp}
          style={{ willChange: "transform" }}
        />
      </motion.div>

      {/* Avoid */}
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          What should the course avoid?
        </label>
        <motion.textarea
          rows={4}
          value={avoid}
          onChange={(e) => setWizardData({ avoid: e.target.value })}
          placeholder="e.g. Avoid lengthy statute-by-statute summaries."
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
          variants={fadeUp}
          style={{ willChange: "transform" }}
        />
      </motion.div>

      {/* Toggles */}
      <motion.div
        className="space-y-3"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence>
          <ToggleSwitch
            key="case-studies"
            checked={includeCaseStudies}
            onChange={(v) => setWizardData({ includeCaseStudies: v })}
            label="Include Case Studies"
            description="Use realistic case studies to illustrate key concepts"
          />
          <ToggleSwitch
            key="examples"
            checked={includeExamples}
            onChange={(v) => setWizardData({ includeExamples: v })}
            label="Include Examples"
            description="Add practical examples that bring concepts to life"
          />
          <ToggleSwitch
            key="knowledge-checks"
            checked={includeKnowledgeChecks}
            onChange={(v) => setWizardData({ includeKnowledgeChecks: v })}
            label="Include Knowledge Checks"
            description="Test comprehension with embedded questions"
          />
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
