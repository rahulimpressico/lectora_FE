import { useState } from 'react'
import { ArrowLeft, Pencil, ShieldCheck } from 'lucide-react'
import { useCourseStore } from '../../../store/courseStore'
import { cn } from '@/lib/cn'

const RULE_FAMILY_LABELS: Record<string, string> = {
  insurance_ce: 'Insurance CE',
  iarce: 'IARCE',
  firm_element: 'Firm Element',
}

const RULE_FAMILY_OPTIONS = [
  { key: 'insurance_ce', label: 'Insurance CE' },
  { key: 'iarce', label: 'IARCE' },
  { key: 'firm_element', label: 'Firm Element' },
]

export const ThreePanelHeader = () => {
  const {
    setPhase,
    rawDocuments,
    audience,
    courseTitle,
    setCourseTitle,
    detectedRuleFamily,
    setDetectedRuleFamily,
    toS1Validation,
  } = useCourseStore()

  const [editingTitle, setEditingTitle] = useState(false)
  const [localTitle, setLocalTitle] = useState('')
  const [showFamilyDropdown, setShowFamilyDropdown] = useState(false)

  const handleBack = () => {
    setPhase('wizard-outline-review')
  }

  const fileCount = rawDocuments.filter((f) => f.status === 'success').length
  const displayTitle = courseTitle || 'Review & Generate'
  const familyLabel = RULE_FAMILY_LABELS[detectedRuleFamily] ?? detectedRuleFamily

  const startEditTitle = () => {
    setLocalTitle(courseTitle)
    setEditingTitle(true)
  }

  const commitTitle = () => {
    const trimmed = localTitle.trim()
    if (trimmed) setCourseTitle(trimmed)
    setEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitTitle()
    if (e.key === 'Escape') setEditingTitle(false)
  }

  return (
    <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 z-10">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors duration-150 shrink-0"
      >
        <ArrowLeft size={15} />
        <span className="hidden sm:inline">Back</span>
      </button>

      <div className="w-px h-5 bg-slate-200 shrink-0" />

      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <input
            autoFocus
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleTitleKeyDown}
            className="w-full text-sm font-bold text-slate-900 bg-white border border-indigo-400 rounded-md px-2 py-0.5 outline-none focus:ring-2 focus:ring-indigo-100"
          />
        ) : (
          <button
            type="button"
            onClick={startEditTitle}
            className="group flex items-center gap-1.5 text-left max-w-full"
            title="Click to edit course title"
          >
            <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">
              {displayTitle}
            </h1>
            <Pencil size={11} className="shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors" />
          </button>
        )}
        <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
          {fileCount > 0
            ? `${fileCount} file${fileCount !== 1 ? 's' : ''} ready`
            : 'Review the Training Outline and Rules before generating'}
          {audience.trim() && (
            <span className="ml-1.5 text-indigo-500 font-semibold">
              · Audience: {audience.trim()}
            </span>
          )}
        </p>
      </div>

      {/* S1 validation quality badge */}
      {toS1Validation && toS1Validation.overall_score > 0 && (
        <div
          className={cn(
            'hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 shrink-0',
            toS1Validation.status === 'PASS'
              ? 'bg-emerald-50 ring-emerald-200/80'
              : 'bg-amber-50 ring-amber-200/80',
          )}
          title={`S1 Validation: ${toS1Validation.summary || toS1Validation.status}`}
        >
          <ShieldCheck
            size={11}
            className={toS1Validation.status === 'PASS' ? 'text-emerald-500' : 'text-amber-500'}
          />
          <span
            className={cn(
              'text-[11px] font-semibold',
              toS1Validation.status === 'PASS' ? 'text-emerald-700' : 'text-amber-700',
            )}
          >
            S1 {Math.round(toS1Validation.overall_score)}%
          </span>
        </div>
      )}

      {detectedRuleFamily && (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowFamilyDropdown((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 ring-1 ring-violet-200/80 hover:bg-violet-100 transition-colors"
            title="Change rule family"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            <span className="text-xs font-semibold text-violet-700">{familyLabel}</span>
          </button>
          {showFamilyDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFamilyDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl bg-white shadow-lg ring-1 ring-slate-200 overflow-hidden">
                {RULE_FAMILY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setDetectedRuleFamily(opt.key)
                      setShowFamilyDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                      detectedRuleFamily === opt.key
                        ? 'bg-violet-50 text-violet-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.key === detectedRuleFamily && <span className="mr-1">✓</span>}
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
