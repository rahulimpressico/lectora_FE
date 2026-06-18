import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { BarChart2, FileText, Layers } from 'lucide-react'
import { useCourseStore } from '../../../store/courseStore'
import { useWizardNav } from '../WizardNavContext'
import { cn } from '@/lib/cn'
import type { WizardData } from '../../../types/wizard'

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

interface ToggleSwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
}

const ToggleSwitch = ({ checked, onChange, label, description }: ToggleSwitchProps) => (
  <div className="flex items-start justify-between gap-4 p-4 bg-white border border-border rounded-xl">
    <div>
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'shrink-0 relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none',
        checked ? 'bg-brand-500' : 'bg-slate-200',
      )}
    >
      <span
        className={cn(
          'inline-block w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  </div>
)

export const CourseDirectionStep = () => {
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)

  const tone = wizardData.tone ?? ''
  const depth = wizardData.depth ?? 'balanced'
  const emphasis = wizardData.emphasis ?? ''
  const avoid = wizardData.avoid ?? ''
  const includeScenarios = wizardData.includeScenarios ?? true
  const includeKnowledgeChecks = wizardData.includeKnowledgeChecks ?? true

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-objectives',
      backLabel: 'Back',
      nextPhase: 'wizard-outline-pref',
      nextLabel: 'Next: Outline Preference',
      isNextDisabled: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Course Style</p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">How should this course feel?</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">Set tone, depth, and emphasis. This is how the AI writes — regulatory, conversational, or technical.</p>
      </div>

      {/* Course Tone */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Course Tone
        </label>
        <input
          type="text"
          value={tone}
          onChange={(e) => setWizardData({ tone: e.target.value })}
          placeholder="e.g. Practical and direct"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all mb-2"
        />
        <div className="flex flex-wrap gap-2">
          {TONE_PILLS.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => setWizardData({ tone: pill })}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-all',
                tone === pill
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600',
              )}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Course Depth */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Course Depth
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DEPTH_CARDS.map((card) => (
            <button
              key={card.value}
              type="button"
              onClick={() => setWizardData({ depth: card.value })}
              className={cn(
                'flex flex-col items-start gap-2 p-4 rounded-xl cursor-pointer transition-all text-left',
                depth === card.value
                  ? 'border-2 border-brand-500 bg-brand-50 shadow-sm'
                  : 'border border-slate-200/80 bg-white/80 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/30 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  depth === card.value ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
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

      {/* Emphasis */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          What should the course emphasize?
        </label>
        <textarea
          rows={3}
          value={emphasis}
          onChange={(e) => setWizardData({ emphasis: e.target.value })}
          placeholder="e.g. Focus on real-world agent responsibilities and employer decision-making."
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
        />
      </div>

      {/* Avoid */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          What should the course avoid?
        </label>
        <textarea
          rows={2}
          value={avoid}
          onChange={(e) => setWizardData({ avoid: e.target.value })}
          placeholder="e.g. Avoid lengthy statute-by-statute summaries."
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
        />
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <ToggleSwitch
          checked={includeScenarios}
          onChange={(v) => setWizardData({ includeScenarios: v })}
          label="Include Scenarios and Examples"
          description="Bring concepts to life with practical examples"
        />
        <ToggleSwitch
          checked={includeKnowledgeChecks}
          onChange={(v) => setWizardData({ includeKnowledgeChecks: v })}
          label="Include Knowledge Checks"
          description="Test comprehension with embedded questions"
        />
      </div>
    </div>
  )
}
