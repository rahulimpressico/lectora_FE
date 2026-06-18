import { Tag, BarChart2, Hash, Timer, Award } from 'lucide-react'
import { DIFFICULTY_OPTIONS, INPUT_CLS } from '../constants'
import {
  detectKey,
  getStr,
  getSections,
  resolveTotalsField,
} from '../helpers'
import type { JsonObject, JsonValue } from '../helpers'

interface OverviewStepProps {
  localTO: JsonObject
  onChange: (path: string[], value: JsonValue) => void
}

interface MetricDisplayProps {
  icon: React.FC<{ size?: number; className?: string }>
  label: string
  value: string
  unit: string
}

const MetricDisplay = ({ icon: Icon, label, value, unit }: MetricDisplayProps) => (
  <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
    <div className="flex items-center gap-1.5">
      <Icon size={12} className="text-indigo-400 shrink-0" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
    <p className="text-xl font-extrabold text-slate-800 leading-none tabular-nums">{value}</p>
    <p className="text-[11px] font-medium text-slate-400">{unit}</p>
  </div>
)

export const OverviewStep = ({ localTO, onChange }: OverviewStepProps) => {
  const nameKey       = detectKey(localTO, 'course_name', 'courseTitle', 'name')
  const descKey       = detectKey(localTO, 'description', 'course_description', 'overview')
  const topicKey      = detectKey(localTO, 'topic', 'course_topic', 'subject')
  const difficultyKey = detectKey(localTO, 'difficulty', 'difficulty_level')

  const wcField  = resolveTotalsField(localTO, 'word_count')
  const minField = resolveTotalsField(localTO, 'minutes')
  const chField  = resolveTotalsField(localTO, 'credit_hours')

  const sections    = getSections(localTO)
  const diffVal     = getStr(localTO, difficultyKey)
  const diffOpt     = DIFFICULTY_OPTIONS.find((o) => o.value === diffVal)
  const diffDisplay = diffOpt ? `${diffOpt.label} — ${diffOpt.desc}` : diffVal || '—'

  return (
    <div className="space-y-5">
      {/* Course Name */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1">
          Course Name
        </label>
        <p className="text-xs text-slate-500 mb-2 leading-relaxed">
          The official title of this training course.
        </p>
        <input
          type="text"
          value={getStr(localTO, nameKey)}
          onChange={(e) => onChange([nameKey], e.target.value)}
          placeholder="Enter course name…"
          className={INPUT_CLS}
        />
      </div>

      {/* Course Description */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1">
          Course Description
        </label>
        <p className="text-xs text-slate-500 mb-2 leading-relaxed">
          A brief overview of what this course covers.
        </p>
        <textarea
          rows={3}
          value={getStr(localTO, descKey)}
          onChange={(e) => onChange([descKey], e.target.value)}
          placeholder="Describe the course content and purpose…"
          className={`${INPUT_CLS} resize-none`}
        />
      </div>

      {/* Topic — editable */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1">
          <Tag size={13} className="text-slate-400 shrink-0" />
          Topic
        </label>
        <p className="text-xs text-slate-500 mb-2 leading-relaxed">
          The primary subject area of this course.
        </p>
        <input
          type="text"
          value={getStr(localTO, topicKey)}
          onChange={(e) => onChange([topicKey], e.target.value)}
          placeholder="e.g. Insurance Regulations, Risk Management…"
          className={INPUT_CLS}
        />
      </div>

      {/* Difficulty — read-only */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm mt-0.5">
          <BarChart2 size={13} className="text-slate-500" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Difficulty Level</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800 leading-snug">{diffDisplay}</p>
        </div>
      </div>

      {/* Course Metrics — read-only */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Course Metrics
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricDisplay
            icon={Hash}
            label="Total Words"
            value={wcField.value > 0 ? wcField.value.toLocaleString() : '—'}
            unit="words"
          />
          <MetricDisplay
            icon={Timer}
            label="Duration"
            value={minField.value > 0 ? minField.value.toLocaleString() : '—'}
            unit="minutes"
          />
          <MetricDisplay
            icon={Award}
            label="Credit Hours"
            value={chField.value > 0 ? chField.value.toFixed(3) : '—'}
            unit="CE hrs"
          />
        </div>
      </div>

      {/* Section count — read-only */}
      {sections.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-2.5">
          <div className="h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
          <span className="text-xs text-slate-600">
            <span className="font-semibold">{sections.length}</span>{' '}
            {sections.length === 1 ? 'section' : 'sections'} — review titles &amp; sub-topics in Step 3
          </span>
        </div>
      )}
    </div>
  )
}
