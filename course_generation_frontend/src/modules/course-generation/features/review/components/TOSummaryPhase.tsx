import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2,
  FileText,
  Shield,
  ArrowRight,
  Pencil,
  BookOpen,
  Clock,
  LayoutList,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { useCourseStore } from '../../../store/courseStore'
import { TrainingOutlineModal } from './TrainingOutlineModal'
import { RulesModal } from './RulesModal'
import type { JsonObject } from '../../../types'
import { RULE_FAMILY_LABELS } from '../../../utils/rulePackTooltips'

// ── Summary extraction helpers ─────────────────────────────────────────────────

const getStr = (obj: JsonObject, ...keys: string[]): string => {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

const getNum = (obj: JsonObject, ...keys: string[]): number => {
  for (const k of keys) {
    const v = Number(obj[k])
    if (!isNaN(v) && v > 0) return v
  }
  return 0
}

interface TOSummary {
  courseName: string
  description: string
  sectionCount: number
  creditHours: number
  objectiveCount: number
}

const extractTOSummary = (toData: JsonObject): TOSummary => {
  const courseName = getStr(toData, 'course_name', 'courseTitle', 'name')
  const description = getStr(toData, 'description', 'course_description', 'overview')
  const sections = toData.sections
  const sectionCount = Array.isArray(sections) ? sections.length : 0
  const totals = (toData.totals as JsonObject) ?? {}
  const creditHours = getNum(totals, 'credit_hours') || getNum(toData, 'total_credit_hours')
  const objectives = toData.learning_objectives ?? toData.objectives
  const objectiveCount = Array.isArray(objectives) ? objectives.length : 0
  return { courseName, description, sectionCount, creditHours, objectiveCount }
}

interface RulesSummary {
  familyLabel: string
  family: string
  wordCountRange: string
  categoryCount: number
}

const extractRulesSummary = (rulesData: JsonObject): RulesSummary => {
  const family = getStr(rulesData, 'rule_family', 'ruleFamily', 'family')
  const familyLabel = RULE_FAMILY_LABELS[family] ?? family ?? 'Standard Rules'
  const minWC = getNum(rulesData, 'min_word_count', 'minWordCount')
  const maxWC = getNum(rulesData, 'max_word_count', 'maxWordCount')
  const wordCountRange =
    minWC && maxWC
      ? `${minWC.toLocaleString()} – ${maxWC.toLocaleString()} words`
      : minWC
        ? `Min ${minWC.toLocaleString()} words`
        : ''
  const categoryCount = Object.keys(rulesData).filter((k) => {
    const v = rulesData[k]
    return typeof v === 'object' && v !== null
  }).length
  return { family, familyLabel, wordCountRange, categoryCount }
}

const truncate = (text: string, maxLen: number): string => {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '…'
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  icon: LucideIcon
  value: string | number
  label: string
  bg: string
  text: string
}

const StatTile = ({ icon: Icon, value, label, bg, text }: StatTileProps) => (
  <div className={`flex flex-col items-center gap-1.5 rounded-2xl px-3 py-3.5 ${bg}`}>
    <Icon size={15} className={text} />
    <span className={`text-lg font-extrabold leading-none ${text}`}>{value}</span>
    <span className={`text-[10px] font-semibold uppercase tracking-wider opacity-70 ${text}`}>
      {label}
    </span>
  </div>
)

// ── Training Outline card ──────────────────────────────────────────────────────

interface TOCardProps {
  toData: JsonObject
  courseTitle: string
  onClick: () => void
}

const TOCard = ({ toData, courseTitle, onClick }: TOCardProps) => {
  const summary = extractTOSummary(toData)
  const displayName = courseTitle || summary.courseName || 'Training Outline'
  const hasStats = summary.sectionCount > 0 || summary.creditHours > 0 || summary.objectiveCount > 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left rounded-3xl bg-white
                 border border-slate-200/80
                 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.10),0_1px_4px_-1px_rgba(0,0,0,0.06)]
                 hover:shadow-[0_12px_40px_-8px_rgba(99,102,241,0.22),0_4px_12px_-2px_rgba(99,102,241,0.10)]
                 hover:-translate-y-1.5 hover:border-indigo-200/70
                 transition-all duration-300 ease-out
                 overflow-hidden
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
    >
      {/* Gradient header */}
      <div className="relative bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 px-6 pt-6 pb-7 overflow-hidden">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/8" />
        <div className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/6" />
        <div className="pointer-events-none absolute top-4 right-16 h-8 w-8 rounded-full bg-indigo-400/30" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 shadow-inner">
              <FileText size={22} className="text-white drop-shadow-sm" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-indigo-300 mb-0.5">
                AI Generated
              </p>
              <h3 className="text-[17px] font-bold text-white leading-tight">Training Outline</h3>
            </div>
          </div>

          {/* Edit badge */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/12 group-hover:bg-white/22 border border-white/15 group-hover:border-white/30 px-3 py-1.5 transition-all duration-200">
            <Pencil size={11} className="text-white" />
            <span className="text-[11px] font-bold text-white">Edit</span>
          </div>
        </div>
      </div>

      {/* Overlap chip */}
      <div className="relative -mt-3.5 px-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-indigo-100 shadow-sm px-3 py-1">
          <Sparkles size={10} className="text-indigo-500" />
          <span className="text-[11px] font-semibold text-indigo-600">Ready to review</span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-6 pt-3 pb-5 space-y-4">
        <div>
          <p className="text-[15px] font-bold text-slate-900 leading-snug">
            {displayName}
          </p>
          {summary.description && (
            <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">
              {truncate(summary.description, 200)}
            </p>
          )}
        </div>

        {/* Stats */}
        {hasStats && (
          <div className="grid grid-cols-3 gap-2.5">
            {summary.sectionCount > 0 && (
              <StatTile
                icon={LayoutList}
                value={summary.sectionCount}
                label="Sections"
                bg="bg-indigo-50"
                text="text-indigo-600"
              />
            )}
            {summary.creditHours > 0 && (
              <StatTile
                icon={Clock}
                value={summary.creditHours.toFixed(1)}
                label="Credit Hrs"
                bg="bg-blue-50"
                text="text-blue-600"
              />
            )}
            {summary.objectiveCount > 0 && (
              <StatTile
                icon={BookOpen}
                value={summary.objectiveCount}
                label="Objectives"
                bg="bg-violet-50"
                text="text-violet-600"
              />
            )}
          </div>
        )}

        {/* CTA row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-[12px] font-semibold text-indigo-500 group-hover:text-indigo-700 transition-colors">
            Click to review &amp; edit
          </span>
          <ChevronRight
            size={15}
            className="text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </div>
    </button>
  )
}

// ── Rules card ─────────────────────────────────────────────────────────────────

interface RulesCardProps {
  rulesData: JsonObject
  detectedRuleFamily: string
  onClick: () => void
}

const RulesCard = ({ rulesData, detectedRuleFamily, onClick }: RulesCardProps) => {
  const summary = extractRulesSummary(rulesData)
  const familyLabel = RULE_FAMILY_LABELS[detectedRuleFamily] ?? summary.familyLabel

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left rounded-3xl bg-white
                 border border-slate-200/80
                 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.10),0_1px_4px_-1px_rgba(0,0,0,0.06)]
                 hover:shadow-[0_12px_40px_-8px_rgba(139,92,246,0.22),0_4px_12px_-2px_rgba(139,92,246,0.10)]
                 hover:-translate-y-1.5 hover:border-violet-200/70
                 transition-all duration-300 ease-out
                 overflow-hidden
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
    >
      {/* Gradient header */}
      <div className="relative bg-gradient-to-br from-violet-500 via-violet-600 to-purple-700 px-6 pt-6 pb-7 overflow-hidden">
        <div className="pointer-events-none absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/8" />
        <div className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/6" />
        <div className="pointer-events-none absolute top-4 right-16 h-8 w-8 rounded-full bg-violet-400/30" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 shadow-inner">
              <Shield size={22} className="text-white drop-shadow-sm" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-300 mb-0.5">
                Auto Applied
              </p>
              <h3 className="text-[17px] font-bold text-white leading-tight">Rules &amp; Requirements</h3>
            </div>
          </div>

          {/* Edit badge */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/12 group-hover:bg-white/22 border border-white/15 group-hover:border-white/30 px-3 py-1.5 transition-all duration-200">
            <Pencil size={11} className="text-white" />
            <span className="text-[11px] font-bold text-white">Edit</span>
          </div>
        </div>
      </div>

      {/* Overlap chip */}
      <div className="relative -mt-3.5 px-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-violet-100 shadow-sm px-3 py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          <span className="text-[11px] font-semibold text-violet-600">Compliance configured</span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-6 pt-3 pb-5 space-y-4">
        {/* Rule family */}
        {familyLabel && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">
              Rule Standard
            </p>
            <div className="flex items-center gap-2.5 rounded-2xl bg-violet-50 border border-violet-100/80 px-4 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                <Shield size={13} className="text-violet-600" />
              </div>
              <span className="text-[13px] font-bold text-violet-900">{familyLabel}</span>
            </div>
          </div>
        )}

        {/* Word count range */}
        {summary.wordCountRange && (
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
            <div className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black text-slate-600">W</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Word Count Target</p>
              <p className="text-[13px] font-bold text-slate-800 mt-0.5">{summary.wordCountRange}</p>
            </div>
          </div>
        )}

        {/* Categories note */}
        {summary.categoryCount > 0 && (
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-[12px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-700">
                {summary.categoryCount} rule {summary.categoryCount !== 1 ? 'categories' : 'category'}
              </span>{' '}
              are applied automatically during generation to ensure quality and compliance.
            </p>
          </div>
        )}

        {/* CTA row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-[12px] font-semibold text-violet-500 group-hover:text-violet-700 transition-colors">
            Click to review &amp; edit
          </span>
          <ChevronRight
            size={15}
            className="text-violet-400 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </div>
    </button>
  )
}

// ── Main phase component ───────────────────────────────────────────────────────

export const TOSummaryPhase = () => {
  const { toData, rulesData, courseTitle, detectedRuleFamily, setPhase } = useCourseStore()
  const [showTOModal, setShowTOModal] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)

  if (!toData || !rulesData) return null

  return (
    <div className="relative flex min-h-full flex-col overflow-y-auto">
      {/* Background layer */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-50/60 via-white/80 to-white" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(199,210,254,0.35),transparent)]" />

      {/* Scrollable content */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl">

          {/* ── Success header ─────────────────────────────────────────────── */}
          <div className="mb-12 text-center">
            {/* Pill badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[12px] font-bold tracking-wide text-emerald-700">
                Generation Complete
              </span>
            </div>

            {/* Icon stack */}
            <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
              {/* Outer pulse ring */}
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-200/50" style={{ animationDuration: '2.4s' }} />
              {/* Middle ring */}
              <span className="absolute inset-2 rounded-full bg-emerald-100" />
              {/* Inner icon circle */}
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_0_4px_rgba(209,250,229,0.8),0_4px_16px_rgba(16,185,129,0.35)]">
                <CheckCircle2 size={28} className="text-white drop-shadow" />
              </span>
            </div>

            <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Training Outline Ready!
            </h1>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-500">
              Your training outline and compliance rules have been generated.
              Review them below, make any edits, then click{' '}
              <span className="font-semibold text-indigo-600">Review &amp; Finalize</span>{' '}
              when you're ready to proceed.
            </p>
          </div>

          {/* ── Cards grid ────────────────────────────────────────────────── */}
          <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TOCard
              toData={toData}
              courseTitle={courseTitle}
              onClick={() => setShowTOModal(true)}
            />
            <RulesCard
              rulesData={rulesData}
              detectedRuleFamily={detectedRuleFamily}
              onClick={() => setShowRulesModal(true)}
            />
          </div>

          {/* ── Review CTA ────────────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setPhase('three-panel')}
              className="group inline-flex h-12 items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600
                         px-8 text-[15px] font-bold text-white
                         shadow-[0_4px_20px_rgba(99,102,241,0.4)]
                         hover:from-indigo-500 hover:to-violet-500
                         hover:shadow-[0_6px_28px_rgba(99,102,241,0.5)]
                         hover:-translate-y-0.5
                         active:translate-y-0 active:shadow-[0_2px_12px_rgba(99,102,241,0.35)]
                         transition-all duration-200
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            >
              Review &amp; Finalize
              <ArrowRight
                size={17}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </button>
            <p className="text-[13px] text-slate-400">
              Opens the detailed review screen — make final edits before generating the course.
            </p>
          </div>

        </div>
      </div>

      {/* Training Outline editing modal */}
      {showTOModal && (
        <TrainingOutlineModal onClose={() => setShowTOModal(false)} />
      )}

      {/* Rules editing modal */}
      {showRulesModal && (
        <RulesModal onClose={() => setShowRulesModal(false)} />
      )}
    </div>
  )
}
