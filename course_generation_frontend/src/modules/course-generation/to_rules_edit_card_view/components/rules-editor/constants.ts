import type { LucideIcon } from 'lucide-react'
import {
  Info,
  ClipboardList,
  Palette,
  Scale,
  FileText,
  Layers,
  Monitor,
  AlertTriangle,
  Shield,
} from 'lucide-react'

// ── Accent colors — all classes explicit so Tailwind includes them ─────────────

export const ACCENTS = {
  indigo: {
    border:   'border-indigo-100',
    header:   'from-indigo-50 to-slate-50',
    iconBg:   'bg-indigo-100',
    iconText: 'text-indigo-600',
  },
  emerald: {
    border:   'border-emerald-100',
    header:   'from-emerald-50 to-slate-50',
    iconBg:   'bg-emerald-100',
    iconText: 'text-emerald-600',
  },
  violet: {
    border:   'border-violet-100',
    header:   'from-violet-50 to-slate-50',
    iconBg:   'bg-violet-100',
    iconText: 'text-violet-600',
  },
  rose: {
    border:   'border-rose-100',
    header:   'from-rose-50 to-slate-50',
    iconBg:   'bg-rose-100',
    iconText: 'text-rose-600',
  },
  amber: {
    border:   'border-amber-100',
    header:   'from-amber-50 to-slate-50',
    iconBg:   'bg-amber-100',
    iconText: 'text-amber-600',
  },
  sky: {
    border:   'border-sky-100',
    header:   'from-sky-50 to-slate-50',
    iconBg:   'bg-sky-100',
    iconText: 'text-sky-600',
  },
  slate: {
    border:   'border-slate-200',
    header:   'from-slate-100 to-slate-50',
    iconBg:   'bg-slate-200',
    iconText: 'text-slate-600',
  },
  orange: {
    border:   'border-orange-100',
    header:   'from-orange-50 to-slate-50',
    iconBg:   'bg-orange-100',
    iconText: 'text-orange-600',
  },
} as const

export type AccentKey = keyof typeof ACCENTS

// ── Card definitions ──────────────────────────────────────────────────────────

export interface CardDef {
  id: string
  label: string
  description: string
  Icon: LucideIcon
  accent: AccentKey
  /** Candidate top-level keys in rulesData. null = overview (top-level primitives). */
  candidateKeys: string[] | null
}

export const CARD_DEFS: CardDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    description:
      'Core identity of this rule pack — course family name, version, governing body, target audience, and baseline word-count benchmarks.',
    Icon: Info,
    accent: 'indigo',
    candidateKeys: null,
  },
  {
    id: 'assessment',
    label: 'Assessment Rules',
    description:
      'Controls the structure and quality of the final exam — minimum question counts, accepted formats, answer option settings, and rationale requirements.',
    Icon: ClipboardList,
    accent: 'emerald',
    candidateKeys: ['assessment_rules', 'assessment', 'exam_rules'],
  },
  {
    id: 'style',
    label: 'Style Constants',
    description:
      'Writing standards applied to all generated content — reading level, tone, paragraph structure, vocabulary rules, and formatting preferences.',
    Icon: Palette,
    accent: 'violet',
    candidateKeys: ['style_constants', 'style', 'writing_style', 'writing_standards'],
  },
  {
    id: 'compliance',
    label: 'Compliance Elements',
    description:
      'Regulatory constraints that content must satisfy — citation requirements, forbidden phrases, and mandatory writing behaviors for the governing body.',
    Icon: Scale,
    accent: 'rose',
    candidateKeys: ['compliance_elements', 'compliance', 'regulatory_elements'],
  },
  {
    id: 'content',
    label: 'Content Rules',
    description:
      'Structural requirements for course content — learning objective coverage, mandatory sections, example counts per section, and integrity constraints.',
    Icon: FileText,
    accent: 'amber',
    candidateKeys: ['content_rules', 'content', 'structural_rules', 'course_content_rules'],
  },
  {
    id: 'kc_placement',
    label: 'KC Placement Rules',
    description:
      'Controls where and how Knowledge Checks appear — frequency per lesson, question counts, accepted answer options, and topics where KCs must be avoided.',
    Icon: Layers,
    accent: 'sky',
    candidateKeys: ['kc_placement_rules', 'kc_placement', 'knowledge_check_rules', 'kc_rules'],
  },
  {
    id: 'authoring',
    label: 'Authoring Constraints',
    description:
      'Technical limits for the content authoring environment — maximum words per screen, callout and table permissions, bullet preferences, and page-break strategy.',
    Icon: Monitor,
    accent: 'slate',
    candidateKeys: ['lectora_constraints', 'lms_constraints', 'authoring_constraints', 'tool_constraints'],
  },
  {
    id: 'error_tolerance',
    label: 'Error Tolerance',
    description:
      'Pipeline reliability settings — acceptable variance from word-count targets before a warning fires, and retry limits for failed generation steps.',
    Icon: AlertTriangle,
    accent: 'orange',
    candidateKeys: ['error_tolerance', 'validation', 'retry_settings'],
  },
]

export const FALLBACK_CARD_DEF_BASE: Omit<CardDef, 'id' | 'label' | 'description' | 'candidateKeys'> = {
  Icon: Shield,
  accent: 'slate',
}

export const FIELD_BASE_CLS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all'
