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
} from 'lucide-react'

export const INPUT_CLS =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all'

export interface StepDef {
  id: string
  /** Short label shown in the step bar */
  label: string
  /** Longer description shown in the step card header */
  description: string
  Icon: LucideIcon
  /** Top-level rulesData keys to probe (in priority order). null = overview (top-level primitives). */
  candidates: string[] | null
}

export const STEP_DEFS: StepDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Core rule pack identity — rule family, version, governing body, and word-count targets.',
    Icon: Info,
    candidates: null,
  },
  {
    id: 'assessment',
    label: 'Assessment',
    description: 'Controls the structure and quality of the final exam — minimum question counts, formats, answer options, and rationale requirements.',
    Icon: ClipboardList,
    candidates: ['assessment_rules', 'assessment', 'exam_rules'],
  },
  {
    id: 'style',
    label: 'Style',
    description: 'Writing standards applied to all generated content — reading level, tone, paragraph structure, and vocabulary rules.',
    Icon: Palette,
    candidates: ['style_constants', 'style', 'writing_style', 'writing_standards'],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    description: 'Regulatory constraints that content must satisfy — citation requirements, forbidden phrases, and mandatory behaviors.',
    Icon: Scale,
    candidates: ['compliance_elements', 'compliance', 'regulatory_elements'],
  },
  {
    id: 'content',
    label: 'Content',
    description: 'Structural requirements for course content — learning objective coverage, mandatory sections, and example counts.',
    Icon: FileText,
    candidates: ['content_rules', 'content', 'structural_rules', 'course_content_rules'],
  },
  {
    id: 'kc_placement',
    label: 'KC Placement',
    description: 'Controls where and how Knowledge Checks appear — frequency per lesson, question counts, and accepted answer options.',
    Icon: Layers,
    candidates: ['kc_placement_rules', 'kc_placement', 'knowledge_check_rules', 'kc_rules'],
  },
  {
    id: 'constraints',
    label: 'Constraints',
    description: 'Technical limits for the authoring environment — screen word limits, callout permissions, bullet preferences, and page-break strategy.',
    Icon: Monitor,
    candidates: ['lectora_constraints', 'lms_constraints', 'authoring_constraints', 'tool_constraints'],
  },
  {
    id: 'error_tolerance',
    label: 'Error Tolerance',
    description: 'Pipeline reliability settings — acceptable variance from word-count targets and retry limits for failed generation steps.',
    Icon: AlertTriangle,
    candidates: ['error_tolerance', 'validation', 'retry_settings'],
  },
]
