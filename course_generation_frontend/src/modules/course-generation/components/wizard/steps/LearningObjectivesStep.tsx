import { useEffect, useState } from 'react'
import { Check, ClipboardList, Sparkles } from 'lucide-react'
import { useCourseStore } from '../../../store/courseStore'
import { useWizardNav } from '../WizardNavContext'
import { cn } from '@/lib/cn'

const AI_CONTEXT_BULLETS = [
  'Course title & description',
  'Duration & difficulty',
  'Target audience',
  'Source materials',
]

export const LearningObjectivesStep = () => {
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)

  const objectivesMode = wizardData.objectivesMode ?? 'ai-generated'
  const objectives = wizardData.objectives ?? []

  const [rawText, setRawText] = useState<string>(objectives.join('\n'))

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-materials',
      backLabel: 'Back',
      nextPhase: 'wizard-direction',
      nextLabel: 'Next: Course Direction',
      isNextDisabled: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTextChange = (text: string) => {
    setRawText(text)
    const parsed = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    setWizardData({ objectives: parsed })
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Learning Goals</p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">What should learners achieve?</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">Clear objectives anchor every section to a measurable, defensible outcome.</p>
      </div>

      {/* Mode selection cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Provided */}
        <button
          type="button"
          onClick={() => setWizardData({ objectivesMode: 'provided' })}
          className={cn(
            'flex flex-col items-start gap-3 p-5 rounded-xl cursor-pointer transition-all text-left',
            objectivesMode === 'provided'
              ? 'border-2 border-brand-500 bg-brand-50 shadow-sm'
              : 'border border-slate-200 bg-white shadow-sm hover:border-brand-300 hover:bg-brand-50/50 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
          )}
        >
          <div
            className={cn(
              'p-2.5 rounded-lg',
              objectivesMode === 'provided' ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
            )}
          >
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">I already have learning objectives</p>
            <p className="text-xs text-slate-500 mt-0.5">Paste your own objectives</p>
          </div>
        </button>

        {/* AI-generated */}
        <button
          type="button"
          onClick={() => setWizardData({ objectivesMode: 'ai-generated' })}
          className={cn(
            'flex flex-col items-start gap-3 p-5 rounded-xl cursor-pointer transition-all text-left',
            objectivesMode === 'ai-generated'
              ? 'border-2 border-brand-500 bg-brand-50 shadow-sm'
              : 'border border-slate-200 bg-white shadow-sm hover:border-brand-300 hover:bg-brand-50/50 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
          )}
        >
          <div
            className={cn(
              'p-2.5 rounded-lg',
              objectivesMode === 'ai-generated' ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
            )}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Help me create them</p>
            <p className="text-xs text-slate-500 mt-0.5">AI suggests objectives from your details</p>
          </div>
        </button>
      </div>

      {/* Mode-specific content */}
      {objectivesMode === 'provided' && (
        <div className="space-y-3 fade-in">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Your Learning Objectives
            </label>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Enter each objective on a new line..."
              className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
            />
          </div>
          {objectives.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500 mb-2">
                {objectives.length} objective{objectives.length !== 1 ? 's' : ''} detected
              </p>
              <ul className="space-y-1.5">
                {objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-600 text-xs flex items-center justify-center font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {objectivesMode === 'ai-generated' && (
        <div className="fade-in bg-brand-50 border border-brand-100 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-brand-800 mb-2">
                The assistant will generate learning objectives based on your course details.
              </p>
              <ul className="space-y-1.5">
                {AI_CONTEXT_BULLETS.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2 text-sm text-brand-700">
                    <Check className="w-3.5 h-3.5 shrink-0 text-brand-500" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
