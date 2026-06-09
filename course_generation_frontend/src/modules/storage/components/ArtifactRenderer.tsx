import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  BookOpen,
  BarChart2,
  Eye,
  EyeOff,
  ClipboardCheck,
  Layers,
  Target,
  FileSearch,
  Shuffle,
  GitBranch,
  Hash,
} from 'lucide-react'
import { cn } from '@/lib/cn'

// ---------------------------------------------------------------------------
// Artifact type detection
// ---------------------------------------------------------------------------

type ArtifactType =
  | 'shared_state'
  | 'request_spec'
  | 'course_spec'
  | 'enriched_sections'
  | 'kc_plan'
  | 'generated_content'
  | 'validation_report'
  | 'llm_to_outline'
  | 'provenance_log'
  | 'unknown'

function detectArtifactType(filename: string, data: unknown): ArtifactType {
  const name = filename.toLowerCase().split('/').pop() ?? filename.toLowerCase()

  if (name === 'shared_state.json') return 'shared_state'
  if (name === 'request_spec.json') return 'request_spec'
  if (name === 'course_spec.json') return 'course_spec'
  if (name === 'enriched_sections.json') return 'enriched_sections'
  if (name === 'kc_plan.json') return 'kc_plan'
  if (name === 'generated_content.json') return 'generated_content'
  if (name === 's1_validation.json' || name === 's2_validation.json') return 'validation_report'
  if (name.startsWith('llm_to_outline')) return 'llm_to_outline'
  if (name === 'provenance_log.json') return 'provenance_log'

  // Content-based fallback
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown>
    if ('agent_outputs' in d && 'request_spec' in d) return 'shared_state'
    if ('rule_classification' in d && 'course_metadata' in d) return 'request_spec'
    if ('enriched_sections' in d && 'to_totals' in d) return 'enriched_sections'
    if ('scenario' in d && 'kc_count' in d) return 'kc_plan'
    if ('sections' in d && 'stats' in d && 'course_title' in d) return 'generated_content'
    if ('issues' in d && 'blockers' in d) return 'validation_report'
    if ('llm_to_outline' in d) return 'llm_to_outline'
    if ('course_spec' in d && 'inconsistencies' in d) return 'course_spec'
    // course_spec.json is the A1 output written as the course_spec object directly
    if ('sections' in d && 'total_word_count' in d && 'credit_hours_derived' in d) return 'course_spec'
  }

  return 'unknown'
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    blocker: { label: 'Blocker', cls: 'bg-red-100 text-red-700 border-red-200' },
    critical: { label: 'Critical', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
    warning: { label: 'Warning', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    info: { label: 'Info', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    pass: { label: 'Pass', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    pass_with_warnings: { label: 'Pass with Warnings', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    blocked: { label: 'Blocked', cls: 'bg-red-100 text-red-700 border-red-200' },
    blocker_status: { label: 'Blocked', cls: 'bg-red-100 text-red-700 border-red-200' },
    complete: { label: 'Complete', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    generated: { label: 'Generated', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    skipped: { label: 'Skipped', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    failed: { label: 'Failed', cls: 'bg-red-100 text-red-700 border-red-200' },
  }
  const s = severity?.toLowerCase().replace(/-/g, '_') ?? 'info'
  const cfg = map[s] ?? { label: severity ?? 'Unknown', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

function SeverityIcon({ severity }: { severity: string }) {
  const s = severity?.toLowerCase() ?? ''
  if (s === 'blocker' || s === 'blocked') return <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
  if (s === 'critical') return <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" />
  if (s === 'warning') return <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
  return <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
}

function StatusIcon({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? ''
  if (s === 'pass' || s === 'complete' || s === 'generated') return <CheckCircle2 size={16} className="text-emerald-500" />
  if (s === 'pass_with_warnings') return <AlertTriangle size={16} className="text-amber-500" />
  if (s === 'blocked' || s === 'blocker' || s === 'failed') return <XCircle size={16} className="text-red-500" />
  return <Info size={16} className="text-slate-400" />
}

function SectionCard({
  title,
  children,
  defaultOpen = false,
  badge,
  meta,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: React.ReactNode
  meta?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
        <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{title}</span>
        {badge}
        {meta && <span className="text-xs text-slate-400 shrink-0">{meta}</span>}
      </button>
      {open && <div className="px-4 py-3 space-y-2 border-t border-slate-100">{children}</div>}
    </div>
  )
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-400 shrink-0 w-36">{label}</span>
      <span className={cn('text-slate-800 break-words min-w-0', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  )
}

function StatPill({ label, value, color = 'slate' }: { label: string; value: string | number; color?: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  }
  return (
    <div className={cn('flex flex-col items-center rounded-xl px-4 py-3', colors[color] ?? colors.slate)}>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-xs font-medium mt-0.5">{label}</span>
    </div>
  )
}

function RawJson({ text }: { text: string }) {
  return (
    <pre className="text-xs leading-relaxed bg-slate-900 text-slate-100 rounded-xl p-4 overflow-auto max-h-[60vh] font-mono">
      {text}
    </pre>
  )
}

// ---------------------------------------------------------------------------
// Validation report renderer (s1_validation.json / s2_validation.json)
// ---------------------------------------------------------------------------

interface ValidationIssue {
  field?: string
  expected?: string | number
  found?: string | number
  severity?: string
  message?: string
  rule_source?: string
  remediation?: string
}

interface ValidationReport {
  status?: string
  run_id?: string
  timestamp?: string
  rule_pack_used?: string
  issues?: ValidationIssue[]
  blockers?: number
  criticals?: number
  warnings?: number
  infos?: number
  message?: string
}

function ValidationReportView({ data, filename }: { data: ValidationReport; filename: string }) {
  const stage = filename.toLowerCase().startsWith('s1') ? 'S1 — Structure Review' : 'S2 — Quality Assurance'
  const issues = data.issues ?? []
  const [filter, setFilter] = useState<string>('all')

  const severityOrder = ['blocker', 'critical', 'warning', 'info']
  const filtered = filter === 'all' ? issues : issues.filter(i => i.severity?.toLowerCase() === filter)

  const counts = {
    blocker: data.blockers ?? issues.filter(i => i.severity?.toLowerCase() === 'blocker').length,
    critical: data.criticals ?? issues.filter(i => i.severity?.toLowerCase() === 'critical').length,
    warning: data.warnings ?? issues.filter(i => i.severity?.toLowerCase() === 'warning').length,
    info: data.infos ?? issues.filter(i => i.severity?.toLowerCase() === 'info').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          <ClipboardCheck size={18} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">{stage}</p>
          {data.rule_pack_used && <p className="text-xs text-slate-500">Rule Pack: {data.rule_pack_used}</p>}
        </div>
        {data.status && (
          <div className="ml-auto flex items-center gap-2">
            <StatusIcon status={data.status} />
            <SeverityBadge severity={data.status} />
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatPill label="Blockers" value={counts.blocker} color={counts.blocker > 0 ? 'red' : 'slate'} />
        <StatPill label="Critical" value={counts.critical} color={counts.critical > 0 ? 'amber' : 'slate'} />
        <StatPill label="Warnings" value={counts.warning} color={counts.warning > 0 ? 'amber' : 'slate'} />
        <StatPill label="Info" value={counts.info} color="blue" />
      </div>

      {data.message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {data.message}
        </div>
      )}

      {/* Issues list */}
      {issues.length > 0 && (
        <div className="space-y-3">
          {/* Severity filter tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', ...severityOrder] as const).map((s) => {
              const count = s === 'all' ? issues.length : counts[s as keyof typeof counts] ?? 0
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilter(s)}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-semibold border transition-colors',
                    filter === s
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  )}
                >
                  {s === 'all' ? `All (${count})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${count})`}
                </button>
              )
            })}
          </div>

          <div className="space-y-2">
            {filtered.map((issue, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <SeverityIcon severity={issue.severity ?? 'info'} />
                  <p className="text-sm font-medium text-slate-800">{issue.message ?? '(no message)'}</p>
                  <SeverityBadge severity={issue.severity ?? 'info'} />
                </div>
                {issue.field && (
                  <div className="ml-5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="font-medium text-slate-400">Field</span>
                    <span className="font-mono">{issue.field}</span>
                    {issue.expected !== undefined && (
                      <>
                        <span className="font-medium text-slate-400">Expected</span>
                        <span>{String(issue.expected)}</span>
                      </>
                    )}
                    {issue.found !== undefined && (
                      <>
                        <span className="font-medium text-slate-400">Found</span>
                        <span>{String(issue.found)}</span>
                      </>
                    )}
                    {issue.rule_source && (
                      <>
                        <span className="font-medium text-slate-400">Rule</span>
                        <span className="font-mono">{issue.rule_source}</span>
                      </>
                    )}
                  </div>
                )}
                {issue.remediation && (
                  <div className="ml-5 flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5">
                    <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
                    <span>{issue.remediation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {issues.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
          <CheckCircle2 size={32} className="text-emerald-400" />
          <p className="text-sm font-medium">No issues found — validation passed cleanly.</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Request spec renderer (request_spec.json)
// ---------------------------------------------------------------------------

interface RequestSpec {
  run_id?: string
  timestamp?: string
  course_metadata?: {
    title?: string
    course_id?: string | null
    audience?: string
    course_type?: string
    category?: string
    topic?: string
  }
  rule_classification?: {
    family?: string
    rule_pack_id?: string
    rule_pack_version?: string | number
    llm_confidence?: number
    llm_reasoning?: string
  }
}

function RequestSpecView({ data }: { data: RequestSpec }) {
  const meta = data.course_metadata ?? {}
  const rule = data.rule_classification ?? {}
  const confidence = rule.llm_confidence !== undefined ? `${Math.round(rule.llm_confidence * 100)}%` : undefined

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
          <BookOpen size={18} className="text-violet-600" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">{meta.title ?? 'Course Specification'}</p>
          {data.run_id && <p className="text-xs text-slate-500 font-mono">Run ID: {data.run_id}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Course Metadata</p>
          <Field label="Title" value={meta.title} />
          <Field label="Course Type" value={meta.course_type} />
          <Field label="Category" value={meta.category} />
          <Field label="Audience" value={meta.audience} />
          <Field label="Topic" value={meta.topic} />
          {meta.course_id && <Field label="Course ID" value={meta.course_id} mono />}
        </div>

        <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Rule Classification</p>
          <Field label="Rule Family" value={rule.family} />
          <Field label="Rule Pack" value={rule.rule_pack_id} mono />
          <Field label="Version" value={rule.rule_pack_version !== undefined ? String(rule.rule_pack_version) : undefined} />
          <Field label="Confidence" value={confidence} />
          {rule.llm_reasoning && (
            <div className="pt-1">
              <p className="text-xs text-slate-400 mb-1">Reasoning</p>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-2">{rule.llm_reasoning}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Course spec renderer (course_spec.json / A1 output)
// ---------------------------------------------------------------------------

interface CourseSpecSection {
  id?: string
  heading?: string
  level?: number
  word_count?: number
  estimated_duration_minutes?: number
  is_knowledge_check?: boolean
  has_knowledge_check?: boolean
  is_reserved?: boolean
  maps_to_objectives?: number[]
  interactive_elements?: string[]
  subtopics?: string[]
  image_count?: number
}

interface CourseSpec {
  run_id?: string
  course_title?: string
  total_word_count?: number
  total_duration_minutes?: number
  credit_hours_derived?: number
  credit_hours_a0?: number
  knowledge_check_count?: number
  sections?: CourseSpecSection[]
  inconsistencies?: Array<{ severity?: string; message?: string; section_id?: string }>
  // when accessed as agent_outputs.A1.course_spec
  status?: string
  course_spec?: CourseSpec
}

function CourseSpecView({ data }: { data: CourseSpec }) {
  // Handle wrapped form (agent_outputs.A1 = { status, course_spec: {...} })
  const spec = (data.course_spec ?? data) as CourseSpec
  const sections = spec.sections ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
          <Layers size={18} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">{spec.course_title ?? 'Course Structure'}</p>
          {spec.run_id && <p className="text-xs text-slate-500 font-mono">Run ID: {spec.run_id}</p>}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="Sections" value={sections.length} color="indigo" />
        <StatPill label="Words" value={(spec.total_word_count ?? 0).toLocaleString()} color="blue" />
        <StatPill
          label="Duration"
          value={`${Math.round(spec.total_duration_minutes ?? 0)} min`}
          color="slate"
        />
        <StatPill label="Credit Hours" value={spec.credit_hours_derived ?? spec.credit_hours_a0 ?? '—'} color="emerald" />
      </div>

      {/* Inconsistencies */}
      {(spec.inconsistencies ?? []).length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Analysis Notes</p>
          {(spec.inconsistencies ?? []).map((inc, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
              <SeverityIcon severity={inc.severity ?? 'info'} />
              <span>{inc.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sections list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sections</p>
        {sections.map((sec, i) => (
          <SectionCard
            key={sec.id ?? i}
            title={sec.heading ?? `Section ${i + 1}`}
            meta={sec.word_count ? `${sec.word_count.toLocaleString()} words` : undefined}
            badge={sec.is_knowledge_check ? (
              <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 text-xs font-semibold">Quiz</span>
            ) : sec.has_knowledge_check ? (
              <span className="inline-flex items-center rounded-full bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 text-xs font-semibold">Has Quiz</span>
            ) : undefined}
          >
            <div className="space-y-1.5">
              <Field label="Level" value={sec.level !== undefined ? `H${sec.level}` : undefined} />
              <Field label="Duration" value={sec.estimated_duration_minutes !== undefined ? `${sec.estimated_duration_minutes.toFixed(1)} min` : undefined} />
              {(sec.subtopics ?? []).length > 0 && (
                <Field label="Subtopics" value={sec.subtopics!.join(', ')} />
              )}
              {(sec.interactive_elements ?? []).length > 0 && (
                <Field label="Interactive" value={sec.interactive_elements!.join(', ')} />
              )}
              {(sec.maps_to_objectives ?? []).length > 0 && (
                <Field label="Objectives" value={`#${sec.maps_to_objectives!.map(n => n + 1).join(', #')}`} />
              )}
              {(sec.image_count ?? 0) > 0 && (
                <Field label="Images" value={sec.image_count} />
              )}
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Enriched sections renderer (enriched_sections.json)
// ---------------------------------------------------------------------------

interface EnrichedSubtopic {
  title?: string
  content?: string
  is_knowledge_check?: boolean
  has_knowledge_check?: boolean
}

interface EnrichedSection {
  title?: string
  word_count?: number
  minutes?: number
  credit_hour?: string | number
  interactive_elements?: string[]
  has_knowledge_check?: boolean
  subtopics?: EnrichedSubtopic[]
  content?: string
}

interface EnrichedSectionsData {
  status?: string
  run_id?: string
  timestamp?: string
  to_totals?: { word_count?: number; minutes?: number; credit_hours?: number }
  enriched_sections?: EnrichedSection[]
}

function EnrichedSectionsView({ data }: { data: EnrichedSectionsData }) {
  const sections = data.enriched_sections ?? []
  const totals = data.to_totals ?? {}

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
          <GitBranch size={18} className="text-teal-600" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">Enriched Course Outline</p>
          <p className="text-xs text-slate-500">Section Mapper output — lessons grouped under chapters</p>
        </div>
        {data.status && <SeverityBadge severity={data.status} />}
      </div>

      {(totals.word_count ?? 0) > 0 || (totals.credit_hours ?? 0) > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          <StatPill label="Words" value={(totals.word_count ?? 0).toLocaleString()} color="blue" />
          <StatPill label="Duration" value={`${totals.minutes ?? 0} min`} color="slate" />
          <StatPill label="Credit Hours" value={totals.credit_hours ?? '—'} color="emerald" />
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Sections ({sections.length})
        </p>
        {sections.map((sec, i) => {
          const subtopics = sec.subtopics ?? []
          const kcCount = subtopics.filter(s => s.is_knowledge_check || s.has_knowledge_check).length
          return (
            <SectionCard
              key={i}
              title={sec.title ?? `Section ${i + 1}`}
              meta={sec.word_count ? `${sec.word_count.toLocaleString()} words` : undefined}
              badge={
                kcCount > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 text-xs font-semibold">
                    {kcCount} Quiz{kcCount > 1 ? 'zes' : ''}
                  </span>
                ) : undefined
              }
            >
              <div className="space-y-1.5">
                {sec.minutes !== undefined && <Field label="Duration" value={`${sec.minutes} min`} />}
                {subtopics.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Subtopics ({subtopics.length})</p>
                    <div className="space-y-1">
                      {subtopics.map((sub, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                          <span className="flex-1">{sub.title ?? '(untitled)'}</span>
                          {(sub.is_knowledge_check || sub.has_knowledge_check) && (
                            <span className="text-xs text-purple-600 font-medium">Quiz</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KC Plan renderer (kc_plan.json)
// ---------------------------------------------------------------------------

interface KCDecision {
  subtopic_id?: string
  decision?: string
}

interface KCPlanData {
  status?: string
  scenario?: string
  kc_count?: number
  timestamp?: string
  report?: {
    scenario?: string
    decisions?: KCDecision[]
  }
}

const KC_SCENARIO_LABELS: Record<string, string> = {
  A: 'Scenario A — KCs found in source document and cross-referenced with Training Outline',
  B: 'Scenario B — No source KCs; derived KC placements from Training Outline',
  C: 'Scenario C — No KCs anywhere; rule pack cadence applied',
}

const KC_DECISION_LABELS: Record<string, { label: string; color: string }> = {
  confirmed_by_to: { label: 'Confirmed by TO', color: 'emerald' },
  removed_not_in_to: { label: 'Removed (not in TO)', color: 'slate' },
  kc_from_to: { label: 'Added from TO', color: 'blue' },
  kc_from_rule_pack: { label: 'Added by Rule Pack', color: 'amber' },
}

function KCPlanView({ data }: { data: KCPlanData }) {
  const decisions = data.report?.decisions ?? []
  const scenario = data.scenario ?? data.report?.scenario ?? '?'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
          <Target size={18} className="text-purple-600" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">Knowledge Check Plan</p>
          <p className="text-xs text-slate-500">KC Planner output — assessment placement strategy</p>
        </div>
        {data.status && <SeverityBadge severity={data.status} />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 p-4 space-y-1">
          <p className="text-xs text-slate-400 font-medium">Strategy</p>
          <p className="text-sm font-bold text-slate-800">Scenario {scenario}</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            {KC_SCENARIO_LABELS[scenario] ?? `Scenario ${scenario}`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 space-y-1">
          <p className="text-xs text-slate-400 font-medium">Total KCs Placed</p>
          <p className="text-3xl font-bold text-purple-700">{data.kc_count ?? decisions.filter(d => d.decision?.startsWith('kc') || d.decision === 'confirmed_by_to').length}</p>
          <p className="text-xs text-slate-600">Knowledge checks across all sections</p>
        </div>
      </div>

      {decisions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Placement Decisions ({decisions.length})
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Subtopic</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Decision</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((d, i) => {
                  const cfg = KC_DECISION_LABELS[d.decision ?? ''] ?? { label: d.decision ?? '—', color: 'slate' }
                  const colorMap: Record<string, string> = {
                    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                    blue: 'bg-blue-100 text-blue-700 border-blue-200',
                    amber: 'bg-amber-100 text-amber-700 border-amber-200',
                    slate: 'bg-slate-100 text-slate-600 border-slate-200',
                  }
                  return (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2 font-mono text-xs text-slate-600">{d.subtopic_id ?? '—'}</td>
                      <td className="px-4 py-2">
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', colorMap[cfg.color] ?? colorMap.slate)}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Generated content renderer (generated_content.json)
// ---------------------------------------------------------------------------

interface BodyParagraph {
  type?: string
  content?: string
  items?: string[]
  label?: string
  question?: string
  options?: string[]
  correct_answer?: string
  explanation?: string
}

interface GeneratedSection {
  heading?: string
  level?: number
  section_id?: string
  is_knowledge_check?: boolean
  status?: string
  word_count?: number
  attempts?: number
  body_paragraphs?: BodyParagraph[]
}

interface GeneratedContentData {
  status?: string
  run_id?: string
  course_title?: string
  timestamp?: string
  course_description?: string
  course_conclusion?: string
  sections?: GeneratedSection[]
  stats?: {
    generated?: number
    skipped?: number
    failed?: number
    total_words?: number
  }
}

function BodyParagraphBlock({ para }: { para: BodyParagraph }) {
  switch (para.type) {
    case 'text':
      return <p className="text-sm text-slate-700 leading-relaxed">{para.content}</p>

    case 'bullet_list':
    case 'sub_bullet_list':
      return (
        <ul className={cn('space-y-1', para.type === 'sub_bullet_list' ? 'ml-4' : 'ml-2')}>
          {(para.items ?? []).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )

    case 'numbered_list':
      return (
        <ol className="space-y-1 ml-2 list-decimal list-inside">
          {(para.items ?? []).map((item, i) => (
            <li key={i} className="text-sm text-slate-700">{item}</li>
          ))}
        </ol>
      )

    case 'important_callout':
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          {para.label && <p className="text-xs font-bold text-amber-700 mb-1">{para.label}</p>}
          <p className="text-sm text-amber-800">{para.content}</p>
        </div>
      )

    case 'heading_3':
      return <p className="text-sm font-bold text-slate-800 pt-1">{para.content}</p>

    case 'heading_4':
      return <p className="text-sm font-semibold text-slate-700">{para.content}</p>

    case 'knowledge_check':
      return (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 space-y-2">
          <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Knowledge Check</p>
          <p className="text-sm font-medium text-slate-800">{para.question}</p>
          <div className="space-y-1">
            {(para.options ?? []).map((opt, i) => (
              <div
                key={i}
                className={cn(
                  'text-sm px-3 py-1.5 rounded-lg border',
                  opt.startsWith(`${para.correct_answer})`)
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-medium'
                    : 'bg-white border-slate-200 text-slate-700'
                )}
              >
                {opt}
              </div>
            ))}
          </div>
          {para.explanation && (
            <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-white rounded-lg px-2 py-1.5 border border-slate-200">
              <Info size={12} className="text-indigo-400 shrink-0 mt-0.5" />
              <span>{para.explanation}</span>
            </div>
          )}
        </div>
      )

    default:
      return para.content ? <p className="text-sm text-slate-700">{para.content}</p> : null
  }
}

function GeneratedContentView({ data }: { data: GeneratedContentData }) {
  const sections = data.sections ?? []
  const stats = data.stats ?? {}

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <BarChart2 size={18} className="text-blue-600" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">{data.course_title ?? 'Generated Course Content'}</p>
          {data.run_id && <p className="text-xs text-slate-500 font-mono">Run ID: {data.run_id}</p>}
        </div>
        {data.status && <SeverityBadge severity={data.status} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="Generated" value={stats.generated ?? sections.filter(s => s.status === 'generated').length} color="emerald" />
        <StatPill label="Skipped" value={stats.skipped ?? sections.filter(s => s.status?.startsWith('skipped')).length} color="slate" />
        <StatPill label="Failed" value={stats.failed ?? sections.filter(s => s.status === 'failed').length} color={stats.failed ? 'red' : 'slate'} />
        <StatPill label="Total Words" value={(stats.total_words ?? 0).toLocaleString()} color="blue" />
      </div>

      {data.course_description && (
        <SectionCard title="Course Description" defaultOpen>
          <p className="text-sm text-slate-700 leading-relaxed">{data.course_description}</p>
        </SectionCard>
      )}

      {/* Sections */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Sections ({sections.length})
        </p>
        {sections.map((sec, i) => {
          const paras = sec.body_paragraphs ?? []
          const kcParas = paras.filter(p => p.type === 'knowledge_check')
          return (
            <SectionCard
              key={sec.section_id ?? i}
              title={sec.heading ?? `Section ${i + 1}`}
              meta={sec.word_count ? `${sec.word_count.toLocaleString()} words` : undefined}
              badge={
                <div className="flex items-center gap-1.5">
                  <SeverityBadge severity={sec.status ?? 'generated'} />
                  {kcParas.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 text-xs font-semibold">
                      {kcParas.length} Quiz{kcParas.length > 1 ? 'zes' : ''}
                    </span>
                  )}
                </div>
              }
            >
              {paras.length > 0 ? (
                <div className="space-y-2">
                  {paras.map((para, j) => (
                    <BodyParagraphBlock key={j} para={para} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No content generated for this section.</p>
              )}
            </SectionCard>
          )
        })}
      </div>

      {data.course_conclusion && (
        <SectionCard title="Course Conclusion">
          <p className="text-sm text-slate-700 leading-relaxed">{data.course_conclusion}</p>
        </SectionCard>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Training Outline renderer (llm_to_outline.json)
// ---------------------------------------------------------------------------

interface TOSection {
  title?: string
  word_count?: number
  minutes?: number
  credit_hours?: number
  content?: string
  interactive_elements?: string[]
  subtopics?: Array<{ title?: string; content?: string }>
}

interface TrainingOutlineData {
  timestamp?: string
  run_id?: string
  course_id?: string | null
  llm_to_outline?: {
    course_title?: string
    description?: string
    learning_objectives?: string[]
    totals?: { word_count?: number; minutes?: number; credit_hours?: number }
    sections?: TOSection[]
    _user_edited?: boolean
    _reused_from_preview?: boolean
  }
  total_doc_word_count?: number
  to_outline_total_word_count?: number
  // sometimes written as the inner object directly
  course_title?: string
  description?: string
  learning_objectives?: string[]
  totals?: { word_count?: number; minutes?: number; credit_hours?: number }
  sections?: TOSection[]
}

function TrainingOutlineView({ data }: { data: TrainingOutlineData }) {
  // Handle wrapped vs. unwrapped form
  const outline = data.llm_to_outline ?? (data as TrainingOutlineData)
  const sections = outline.sections ?? []
  const objectives = outline.learning_objectives ?? []
  const totals = outline.totals ?? {}

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-50">
          <FileSearch size={18} className="text-fuchsia-600" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">{outline.course_title ?? 'Training Outline'}</p>
          {data.run_id && <p className="text-xs text-slate-500 font-mono">Run ID: {data.run_id}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {data.llm_to_outline?._user_edited && (
            <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-xs font-semibold">User Edited</span>
          )}
        </div>
      </div>

      {outline.description && (
        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl px-4 py-3">
          {outline.description}
        </p>
      )}

      {/* Totals */}
      {(totals.word_count ?? 0) > 0 || (totals.credit_hours ?? 0) > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          <StatPill label="Words" value={(totals.word_count ?? 0).toLocaleString()} color="blue" />
          <StatPill label="Duration" value={`${totals.minutes ?? 0} min`} color="slate" />
          <StatPill label="Credit Hours" value={totals.credit_hours ?? '—'} color="emerald" />
        </div>
      ) : null}

      {objectives.length > 0 && (
        <SectionCard title={`Learning Objectives (${objectives.length})`} defaultOpen>
          <ol className="space-y-2 list-decimal list-inside">
            {objectives.map((obj, i) => (
              <li key={i} className="text-sm text-slate-700">{obj}</li>
            ))}
          </ol>
        </SectionCard>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Sections ({sections.length})
        </p>
        {sections.map((sec, i) => {
          const subtopics = sec.subtopics ?? []
          return (
            <SectionCard
              key={i}
              title={sec.title ?? `Section ${i + 1}`}
              meta={sec.word_count ? `${sec.word_count.toLocaleString()} words` : undefined}
            >
              <div className="space-y-2">
                {sec.minutes !== undefined && sec.minutes > 0 && (
                  <Field label="Duration" value={`${sec.minutes} min`} />
                )}
                {(sec.interactive_elements ?? []).length > 0 && (
                  <Field label="Interactive" value={sec.interactive_elements!.join(', ')} />
                )}
                {sec.content && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-3 py-2">
                    {sec.content.slice(0, 300)}{sec.content.length > 300 ? '…' : ''}
                  </p>
                )}
                {subtopics.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Subtopics</p>
                    <div className="space-y-1">
                      {subtopics.map((sub, j) => (
                        <div key={j} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                          {sub.title ?? '(untitled)'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Provenance Log renderer (provenance_log.json)
// ---------------------------------------------------------------------------

interface ProvenanceEntry {
  value?: unknown
  source?: string
}

const PROVENANCE_SOURCE_LABELS: Record<string, string> = {
  explicitly_provided: 'Explicitly Provided',
  derived_from_rule_pack: 'Rule Pack',
  inferred: 'Inferred',
  unresolved: 'Unresolved',
}

function ProvenanceLogView({ data }: { data: Record<string, ProvenanceEntry> }) {
  const entries = Object.entries(data)

  const SOURCE_COLORS: Record<string, string> = {
    explicitly_provided: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    derived_from_rule_pack: 'bg-blue-100 text-blue-700 border-blue-200',
    inferred: 'bg-amber-100 text-amber-700 border-amber-200',
    unresolved: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Hash size={18} className="text-slate-600" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">Parameter Sources</p>
          <p className="text-xs text-slate-500">Audit trail — where each pipeline parameter came from</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Parameter</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Value</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Source</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, entry], i) => {
              const src = entry?.source ?? 'unknown'
              const srcLabel = PROVENANCE_SOURCE_LABELS[src] ?? src
              const srcColor = SOURCE_COLORS[src] ?? 'bg-slate-100 text-slate-600 border-slate-200'
              const value = entry?.value
              const displayValue = value === null || value === undefined ? '—' : String(value)
              return (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{key}</td>
                  <td className="px-4 py-2.5 text-slate-800 text-xs max-w-[200px] truncate" title={displayValue}>
                    {displayValue}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', srcColor)}>
                      {srcLabel}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared State renderer (shared_state.json — summary dashboard)
// ---------------------------------------------------------------------------

type SharedStateTab = 'overview' | 'course_spec' | 'training_outline' | 'validation' | 'content'

interface SharedStateData {
  run_id?: string
  status?: string
  source_document?: string
  course_difficulty?: string
  request_spec?: RequestSpec
  extracted_inputs?: {
    title?: string
    learning_objectives?: string[]
    total_doc_word_count?: number
    heading_tree?: unknown[]
    content_generation_bounds?: { min?: number; max?: number }
  }
  images?: unknown[]
  llm_classification?: {
    rule_family?: string
    confidence?: number
    credit_hours_estimate?: number
    reasoning?: string
  }
  llm_to_outline_classification?: TrainingOutlineData
  agent_outputs?: {
    A1?: { status?: string; course_spec?: CourseSpec; inconsistencies?: unknown[] }
    A2?: GeneratedContentData | null
    section_map?: EnrichedSectionsData | null
    kc_planner?: KCPlanData | null
  }
  s1_validation?: ValidationReport
  s2_validation?: ValidationReport
}

function SharedStateView({ data }: { data: SharedStateData }) {
  const [tab, setTab] = useState<SharedStateTab>('overview')

  const tabs: Array<{ id: SharedStateTab; label: string; available: boolean }> = [
    { id: 'overview', label: 'Overview', available: true },
    { id: 'course_spec', label: 'Course Structure', available: !!(data.agent_outputs?.A1?.course_spec) },
    { id: 'training_outline', label: 'Training Outline', available: !!(data.llm_to_outline_classification?.llm_to_outline) },
    { id: 'validation', label: 'Validation', available: !!(data.s1_validation || data.s2_validation) },
    { id: 'content', label: 'Content', available: !!(data.agent_outputs?.A2) },
  ]

  const classification = data.llm_classification ?? {}
  const extracted = data.extracted_inputs ?? {}
  const reqSpec = data.request_spec
  const a1 = data.agent_outputs?.A1
  const a2 = data.agent_outputs?.A2

  const STATUS_LABELS: Record<string, string> = {
    initialised: 'Initialised',
    a1_running: 'A1 Running',
    s1_validated: 'S1 Validated',
    s1_blocked: 'S1 Blocked',
    section_map_complete: 'Section Mapping Done',
    kc_plan_complete: 'KC Planning Done',
    a2_complete: 'Content Generated',
    s2_validated: 'S2 Validated',
    s2_blocked: 'S2 Blocked',
    completed: 'Completed',
    failed: 'Failed',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          <Shuffle size={18} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">
            {reqSpec?.course_metadata?.title ?? extracted.title ?? 'Pipeline Run State'}
          </p>
          <p className="text-xs text-slate-500 font-mono">Run ID: {data.run_id ?? '—'}</p>
        </div>
        {data.status && (
          <div className="ml-auto flex items-center gap-2">
            <StatusIcon status={data.status} />
            <span className="text-sm font-semibold text-slate-700">
              {STATUS_LABELS[data.status] ?? data.status}
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.filter(t => t.available).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              tab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatPill label="Rule Family" value={classification.rule_family?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) ?? '—'} color="indigo" />
            <StatPill label="Doc Words" value={(extracted.total_doc_word_count ?? 0).toLocaleString()} color="blue" />
            <StatPill label="Images Found" value={(data.images ?? []).length} color="slate" />
            <StatPill label="Sections Found" value={(extracted.heading_tree ?? []).length} color="emerald" />
          </div>

          {/* Core info cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Course Info</p>
              <Field label="Title" value={reqSpec?.course_metadata?.title ?? extracted.title} />
              <Field label="Source Doc" value={data.source_document} mono />
              <Field label="Audience" value={reqSpec?.course_metadata?.audience} />
              <Field label="Category" value={reqSpec?.course_metadata?.category} />
              <Field label="Difficulty" value={data.course_difficulty} />
              {extracted.content_generation_bounds && (
                <Field
                  label="Word Budget"
                  value={`${(extracted.content_generation_bounds.min ?? 0).toLocaleString()} – ${(extracted.content_generation_bounds.max ?? 0).toLocaleString()} words`}
                />
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Rule Classification</p>
              <Field label="Family" value={classification.rule_family} />
              <Field label="Confidence" value={classification.confidence !== undefined ? `${Math.round(classification.confidence * 100)}%` : undefined} />
              <Field label="Credit Hours" value={classification.credit_hours_estimate} />
              <Field label="Rule Pack" value={reqSpec?.rule_classification?.rule_pack_id} mono />
              {classification.reasoning && (
                <div className="pt-1">
                  <p className="text-xs text-slate-400 mb-1">Reasoning</p>
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 leading-relaxed">
                    {classification.reasoning}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Validation summary */}
          {(data.s1_validation || data.s2_validation) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.s1_validation && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">S1 — Structure Review</p>
                    <SeverityBadge severity={data.s1_validation.status ?? 'unknown'} />
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-red-600 font-semibold">{data.s1_validation.blockers ?? 0} blockers</span>
                    <span className="text-amber-600 font-semibold">{data.s1_validation.warnings ?? 0} warnings</span>
                    <span className="text-blue-600 font-semibold">{data.s1_validation.infos ?? 0} info</span>
                  </div>
                </div>
              )}
              {data.s2_validation && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">S2 — Quality Assurance</p>
                    <SeverityBadge severity={data.s2_validation.status ?? 'unknown'} />
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-red-600 font-semibold">{data.s2_validation.blockers ?? 0} blockers</span>
                    <span className="text-amber-600 font-semibold">{data.s2_validation.warnings ?? 0} warnings</span>
                    <span className="text-blue-600 font-semibold">{data.s2_validation.infos ?? 0} info</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content stats if A2 is done */}
          {a2 && a2.stats && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Generated Content Summary</p>
              <div className="flex gap-6 text-sm">
                <span className="text-emerald-700 font-semibold">{a2.stats.generated ?? 0} generated</span>
                <span className="text-slate-600 font-semibold">{a2.stats.skipped ?? 0} skipped</span>
                <span className={cn('font-semibold', (a2.stats.failed ?? 0) > 0 ? 'text-red-600' : 'text-slate-400')}>{a2.stats.failed ?? 0} failed</span>
                <span className="text-blue-700 font-semibold">{(a2.stats.total_words ?? 0).toLocaleString()} words total</span>
              </div>
            </div>
          )}

          {/* Learning objectives */}
          {(extracted.learning_objectives ?? []).length > 0 && (
            <SectionCard title={`Learning Objectives (${extracted.learning_objectives!.length})`}>
              <ol className="space-y-1.5 list-decimal list-inside">
                {extracted.learning_objectives!.map((obj, i) => (
                  <li key={i} className="text-sm text-slate-700">{obj}</li>
                ))}
              </ol>
            </SectionCard>
          )}
        </div>
      )}

      {tab === 'course_spec' && a1?.course_spec && (
        <CourseSpecView data={a1.course_spec} />
      )}

      {tab === 'training_outline' && data.llm_to_outline_classification && (
        <TrainingOutlineView data={data.llm_to_outline_classification} />
      )}

      {tab === 'validation' && (
        <div className="space-y-5">
          {data.s1_validation && (
            <ValidationReportView data={data.s1_validation} filename="s1_validation.json" />
          )}
          {data.s2_validation && data.s1_validation && (
            <hr className="border-slate-200" />
          )}
          {data.s2_validation && (
            <ValidationReportView data={data.s2_validation} filename="s2_validation.json" />
          )}
        </div>
      )}

      {tab === 'content' && a2 && (
        <GeneratedContentView data={a2} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Generic / unknown JSON renderer (pretty-printed with collapsible tree)
// ---------------------------------------------------------------------------

function GenericJsonValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)

  if (value === null) return <span className="text-slate-400">null</span>
  if (value === undefined) return <span className="text-slate-400">undefined</span>
  if (typeof value === 'boolean') return <span className={value ? 'text-emerald-600' : 'text-red-500'}>{String(value)}</span>
  if (typeof value === 'number') return <span className="text-blue-600">{value}</span>
  if (typeof value === 'string') {
    if (value.length > 120) {
      return (
        <span
          className="text-amber-700 cursor-pointer underline decoration-dotted"
          title={value}
          onClick={() => alert(value)}
        >
          "{value.slice(0, 120)}…"
        </span>
      )
    }
    return <span className="text-amber-700">"{value}"</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400">[ ]</span>
    return (
      <span>
        <button type="button" onClick={() => setOpen(!open)} className="text-slate-500 hover:text-slate-700">
          {open ? '▾' : '▸'} [{value.length}]
        </button>
        {open && (
          <div className="ml-4 border-l border-slate-200 pl-3 mt-1 space-y-0.5">
            {value.map((item, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-slate-400 shrink-0">{i}:</span>
                <GenericJsonValue value={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <span className="text-slate-400">{'{ }'}</span>
    return (
      <span>
        <button type="button" onClick={() => setOpen(!open)} className="text-slate-500 hover:text-slate-700">
          {open ? '▾' : '▸'} {'{' + entries.length + '}'}
        </button>
        {open && (
          <div className="ml-4 border-l border-slate-200 pl-3 mt-1 space-y-0.5">
            {entries.map(([k, v]) => (
              <div key={k} className="flex gap-2 text-xs">
                <span className="text-indigo-600 shrink-0 font-medium">{k}:</span>
                <GenericJsonValue value={v} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  return <span className="text-slate-700">{String(value)}</span>
}

function GenericJsonView({ data }: { data: unknown }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 overflow-auto max-h-[60vh] text-xs font-mono">
      <GenericJsonValue value={data} depth={0} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main ArtifactRenderer component
// ---------------------------------------------------------------------------

interface ArtifactRendererProps {
  filename: string
  jsonText: string
}

export function ArtifactRenderer({ filename, jsonText }: ArtifactRendererProps) {
  const [showRaw, setShowRaw] = useState(false)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText) as unknown
  } catch {
    // Fallback to raw if not valid JSON
    return <RawJson text={jsonText} />
  }

  const artifactType = detectArtifactType(filename, parsed)

  function renderTyped() {
    switch (artifactType) {
      case 'validation_report':
        return <ValidationReportView data={parsed as ValidationReport} filename={filename} />
      case 'request_spec':
        return <RequestSpecView data={parsed as RequestSpec} />
      case 'course_spec':
        return <CourseSpecView data={parsed as CourseSpec} />
      case 'enriched_sections':
        return <EnrichedSectionsView data={parsed as EnrichedSectionsData} />
      case 'kc_plan':
        return <KCPlanView data={parsed as KCPlanData} />
      case 'generated_content':
        return <GeneratedContentView data={parsed as GeneratedContentData} />
      case 'llm_to_outline':
        return <TrainingOutlineView data={parsed as TrainingOutlineData} />
      case 'shared_state':
        return <SharedStateView data={parsed as SharedStateData} />
      case 'provenance_log':
        return <ProvenanceLogView data={parsed as Record<string, ProvenanceEntry>} />
      default:
        return <GenericJsonView data={parsed} />
    }
  }

  const ARTIFACT_LABELS: Record<ArtifactType, string> = {
    shared_state: 'Pipeline State',
    request_spec: 'Course Specification',
    course_spec: 'Course Structure',
    enriched_sections: 'Enriched Outline',
    kc_plan: 'KC Plan',
    generated_content: 'Generated Content',
    validation_report: 'Validation Report',
    llm_to_outline: 'Training Outline',
    provenance_log: 'Parameter Sources',
    unknown: 'JSON Data',
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-lg bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-semibold">
            {ARTIFACT_LABELS[artifactType]}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {showRaw ? <Eye size={12} /> : <EyeOff size={12} />}
          {showRaw ? 'View Formatted' : 'View Raw JSON'}
        </button>
      </div>

      {/* Content */}
      {showRaw ? <RawJson text={jsonText} /> : renderTyped()}
    </div>
  )
}
