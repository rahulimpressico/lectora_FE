import { useEffect, useState } from 'react'
import { AlertCircle, BookOpen, Clock, RefreshCw } from 'lucide-react'
import { useCourseStore } from '../../../store/courseStore'
import { useGenerateTO } from '../../../hooks/useGenerateTO'
import { useWizardNav } from '../WizardNavContext'
import { cn } from '@/lib/cn'
import type { JsonObject } from '../../../types'

const REVISION_CHIPS = [
  'Make it more practical',
  'Reduce legal detail',
  'Add more case studies',
  'Make sections shorter',
  'Focus on key concepts',
]

function getSections(toData: JsonObject): JsonObject[] {
  const sections = toData.sections ?? toData.modules
  if (Array.isArray(sections)) return sections as JsonObject[]
  return []
}

function getSectionTitle(section: JsonObject): string {
  return (
    (section.title as string | undefined) ??
    (section.name as string | undefined) ??
    'Untitled Section'
  )
}

function getSectionMeta(section: JsonObject): string {
  const wc = section.word_count ?? section.wordCount
  const mins = section.minutes ?? section.duration_minutes
  const ch = section.credit_hours ?? section.credit_hour
  const parts: string[] = []
  if (typeof wc === 'number') parts.push(`${wc.toLocaleString()} words`)
  if (typeof mins === 'number') parts.push(`${mins} min`)
  if (typeof ch === 'number') parts.push(`${ch.toFixed(2)} CE hrs`)
  return parts.join(' · ')
}

export const OutlineReviewStep = () => {
  const setPhase = useCourseStore((s) => s.setPhase)
  const toData = useCourseStore((s) => s.toData)
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const setCustomToPrompt = useCourseStore((s) => s.setCustomToPrompt)
  const customToPrompt = useCourseStore((s) => s.customToPrompt)

  const generateTO = useGenerateTO()

  const [revisionText, setRevisionText] = useState('')
  const [editNote, setEditNote] = useState<string | null>(null)

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-outline-pref',
      backLabel: 'Back',
      nextLabel: 'Enter Workspace',
      isNextDisabled: !toData,
      onNext: () => setPhase('three-panel'),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toData])

  const courseName =
    (toData?.course_name as string | undefined) ||
    (toData?.courseTitle as string | undefined) ||
    courseTitle

  const totalCreditHours =
    (toData?.total_credit_hours as number | undefined) ??
    ((toData?.totals as JsonObject | undefined)?.credit_hours as number | undefined)

  const description =
    (toData?.description as string | undefined) ??
    (toData?.course_description as string | undefined)

  const sections = toData ? getSections(toData) : []

  const handleRegenerate = () => {
    generateTO.mutate()
  }

  const handleRegenerateWithFeedback = () => {
    if (!revisionText.trim()) return
    const combined = [customToPrompt, `Revision request: ${revisionText.trim()}`]
      .filter(Boolean)
      .join('\n\n')
    setCustomToPrompt(combined)
    generateTO.mutate()
  }

  const handleChipClick = (chip: string) => {
    setRevisionText((prev) => (prev ? `${prev}, ${chip.toLowerCase()}` : chip))
  }

  if (generateTO.isPending) {
    return (
      <div className="fade-in flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
          <RefreshCw className="w-7 h-7 text-brand-500 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-slate-800">
            {generateTO.statusMessage ?? 'Generating outline...'}
          </p>
          <p className="text-sm text-slate-500 mt-1">This may take a minute</p>
        </div>
      </div>
    )
  }

  if (!toData) {
    return (
      <div className="fade-in flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-slate-500 text-sm">No outline data found. Please go back and generate one.</p>
        <button
          onClick={() => setPhase('wizard-outline-pref')}
          className="text-sm text-brand-600 underline"
        >
          ← Back to Outline Preference
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Outline Review</p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">Your outline is ready</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">Review the proposed structure. Regenerate, refine, or continue into the full course editor.</p>
      </div>

      {/* Summary card */}
      <div className="bg-white border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-base font-bold text-slate-900">{courseName || 'Untitled Course'}</h3>
        {description && (
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        )}
        <div className="flex flex-wrap gap-3">
          {sections.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
              <BookOpen className="w-3.5 h-3.5 text-brand-400" />
              {sections.length} section{sections.length !== 1 ? 's' : ''}
            </span>
          )}
          {totalCreditHours != null && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              {totalCreditHours.toFixed(2)} CE credit hours
            </span>
          )}
        </div>
      </div>

      {/* Section list */}
      {sections.length > 0 && (
        <div className="space-y-2">
          {sections.map((section, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 p-4 bg-white border border-border rounded-xl"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-xs font-semibold text-brand-600">
                  {i + 1}
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">
                  {getSectionTitle(section)}
                </p>
              </div>
              {getSectionMeta(section) && (
                <span className="shrink-0 text-xs text-slate-400">{getSectionMeta(section)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {generateTO.isError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{generateTO.error?.message ?? 'An error occurred. Please try again.'}</span>
        </div>
      )}

      {/* Secondary actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setEditNote(editNote ? null : 'Full editing available in the workspace')}
          className="flex-1 py-2.5 px-4 border border-slate-200 bg-white text-slate-700 text-sm font-semibold rounded-xl hover:border-brand-300 hover:text-brand-600 transition-all"
        >
          Edit Outline
        </button>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={generateTO.isPending}
          className="flex-1 py-2.5 px-4 border border-brand-200 bg-brand-50 text-brand-700 text-sm font-semibold rounded-xl hover:bg-brand-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>
      </div>

      {/* Edit note toast */}
      {editNote && (
        <div className="fade-in flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {editNote}
        </div>
      )}

      {/* Revision request */}
      <div className="bg-white border border-border rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium text-slate-700">Ask the assistant to revise</p>
        <div className="flex flex-wrap gap-2">
          {REVISION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-all',
                revisionText.toLowerCase().includes(chip.toLowerCase())
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600',
              )}
            >
              {chip}
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          value={revisionText}
          onChange={(e) => setRevisionText(e.target.value)}
          placeholder="Describe how you'd like the outline revised..."
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
        />
        <button
          type="button"
          onClick={handleRegenerateWithFeedback}
          disabled={!revisionText.trim() || generateTO.isPending}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-brand-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply &amp; Regenerate
        </button>
      </div>
    </div>
  )
}
