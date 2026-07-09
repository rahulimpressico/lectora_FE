import type { JsonObject } from '../types'

export interface PresetTrainingOutlineOptions {
  courseTitle?: string
  courseTopic?: string
  audience?: string
  courseTypeHint?: string
  ruleFamily?: string
  durationHours?: number | null
  learningObjectives?: string[]
}

const COURSE_TYPE_LABEL_TO_KEY: Record<string, string> = {
  'Insurance CE': 'insurance_ce',
  IARCE: 'iarce',
  'Firm Element': 'firm_element',
}

function resolveRuleFamily(options: PresetTrainingOutlineOptions): string {
  if (options.ruleFamily?.trim()) return options.ruleFamily.trim()
  const hint = options.courseTypeHint?.trim()
  if (hint && COURSE_TYPE_LABEL_TO_KEY[hint]) return COURSE_TYPE_LABEL_TO_KEY[hint]
  return 'insurance_ce'
}

/** Static Training Outline used when no TO GET API is available. */
export function buildPresetTrainingOutline(
  options: PresetTrainingOutlineOptions = {},
): { to: JsonObject; rules: JsonObject } {
  const courseName =
    options.courseTitle?.trim() ||
    options.courseTopic?.trim() ||
    'Sample Insurance CE Course'

  const audience =
    options.audience?.trim() || 'Licensed insurance professionals seeking continuing education credit'

  const ruleFamily = resolveRuleFamily(options)
  const durationHours = options.durationHours ?? 4
  const objectives =
    options.learningObjectives?.filter(Boolean) ??
    [
      'Explain core regulatory requirements for insurance professionals.',
      'Apply ethical decision-making frameworks to common client scenarios.',
      'Identify compliance obligations when recommending insurance products.',
    ]

  const to: JsonObject = {
    course_name: courseName,
    course_title: courseName,
    description:
      'A structured continuing education course covering regulatory fundamentals, ethical practices, and product compliance.',
    rule_family: ruleFamily,
    target_audience: audience,
    total_credit_hours: durationHours,
    learning_objectives: objectives,
    totals: {
      word_count: 12_000,
      minutes: durationHours * 60,
      credit_hours: durationHours,
    },
    sections: [
      {
        title: 'Regulatory Foundations',
        word_count: 3_000,
        minutes: 60,
        credit_hours: 1,
        sub_topics: [
          'State insurance department oversight',
          'Producer licensing requirements',
          'Continuing education obligations',
        ],
      },
      {
        title: 'Ethics and Professional Conduct',
        word_count: 3_000,
        minutes: 60,
        credit_hours: 1,
        sub_topics: [
          'Fiduciary responsibilities',
          'Conflicts of interest',
          'Fair treatment of policyholders',
        ],
      },
      {
        title: 'Product Compliance and Disclosure',
        word_count: 3_000,
        minutes: 60,
        credit_hours: 1,
        sub_topics: [
          'Suitability and best-interest standards',
          'Required disclosures and documentation',
          'Claims handling expectations',
        ],
      },
      {
        title: 'Applied Scenarios and Knowledge Checks',
        word_count: 3_000,
        minutes: 60,
        credit_hours: 1,
        sub_topics: [
          'Case study: recommendation review',
          'Case study: complaint resolution',
          'Final knowledge check preparation',
        ],
      },
    ],
  }

  const rules: JsonObject = {
    rule_family: ruleFamily,
    ruleFamily,
    version: '1.0',
    governing_body: 'State Insurance Department',
    target_audience: audience,
    baseline_word_count: 12_000,
    assessment_rules: {
      min_questions: 20,
      question_formats: ['multiple_choice', 'scenario_based'],
      require_rationale: true,
    },
    style_constants: {
      reading_level: 'Grade 10-12',
      tone: 'Professional and instructional',
      paragraph_max_words: 120,
    },
    compliance_elements: {
      citation_required: true,
      forbidden_phrases: ['guaranteed returns', 'risk-free'],
      mandatory_disclosures: ['Not all products are available in all states.'],
    },
    content_rules: {
      min_learning_objectives: 3,
      examples_per_section: 2,
      require_summary_per_section: true,
    },
    kc_placement_rules: {
      checks_per_section: 2,
      min_answer_options: 4,
    },
    lectora_constraints: {
      max_words_per_screen: 250,
      allow_tables: true,
      allow_callouts: true,
    },
    error_tolerance: {
      word_count_variance_percent: 10,
      max_retries: 2,
    },
  }

  return { to, rules }
}
