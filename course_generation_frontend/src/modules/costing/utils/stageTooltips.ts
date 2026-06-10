/**
 * Plain-language explanations for costing pipeline stages and document types.
 * Keys match backend stageKey values from costing.py.
 */

export const STAGE_TOOLTIPS: Record<string, string> = {
  a0_classification:
    'Works out what kind of course this is (for example, insurance continuing education) so the right writing and compliance rules are used.',
  to_generation:
    'Creates or reads your timed outline — the lesson plan with topics, timing, and word targets — before the full course is built.',
  outline_interpretation:
    'Reads your study guide and builds a structured course plan: sections, subtopics, and which learning goals each part covers.',
  structure_review:
    'An automatic check on the course plan before generation continues — making sure sections, learning objectives, and structure look right.',
  section_mapping:
    'Groups course sections into chapters and lines them up with the lessons in your timed outline.',
  kc_planning:
    'Decides where short quiz-style knowledge checks should appear in the course.',
  content_generation:
    'Writes the actual lesson text — the content learners will read, one lesson at a time.',
  quality_assurance:
    'Reviews the generated content for length, quality, and rule compliance before the final course document is produced.',
  course_editor:
    'AI edits you make later in the course editor — rewrites, expansions, or tone changes to specific sections.',
  other:
    'Other AI steps that do not fit one of the main pipeline stages above.',
}

/** Lookup by display name when stageKey is missing (e.g. mock data). */
const STAGE_NAME_ALIASES: Record<string, string> = {
  'Rule Classification': 'a0_classification',
  'TO Generation': 'to_generation',
  'Outline Interpretation': 'outline_interpretation',
  'Structure Review': 'structure_review',
  'Section Mapping': 'section_mapping',
  'KC Planning': 'kc_planning',
  'Content Generation': 'content_generation',
  'Quality Assurance': 'quality_assurance',
  'Course Editor': 'course_editor',
  'Other Processing': 'other',
}

export const DOCUMENT_TYPE_TOOLTIPS: Record<string, string> = {
  'Course Generation':
    'A full course was generated — from reading your documents through writing lesson content.',
  'TO Generation':
    'Only the timed outline step ran, usually from the upload screen before starting a full course.',
  'Outline Processing':
    'The study guide was interpreted into a course structure, but full lesson content was not generated.',
  'Pipeline Run':
    'All AI usage from one pipeline job, grouped together by run.',
  'Course Editor':
    'AI changes made inside the course editor after the course was already generated.',
  'Document Run':
    'AI usage tied to this document name in the system logs.',
  'Untagged Run':
    'AI usage that was not linked to a specific course or document name.',
}

export const AGENT_TOOLTIPS: Record<string, string> = {
  A0: STAGE_TOOLTIPS.a0_classification,
  A0_TO: STAGE_TOOLTIPS.to_generation,
  A1: STAGE_TOOLTIPS.outline_interpretation,
  S1: STAGE_TOOLTIPS.structure_review,
  SECTION_MAPPER: STAGE_TOOLTIPS.section_mapping,
  KC_PLANNER: STAGE_TOOLTIPS.kc_planning,
  A2: STAGE_TOOLTIPS.content_generation,
  S2: STAGE_TOOLTIPS.quality_assurance,
  EDITOR: STAGE_TOOLTIPS.course_editor,
}

export function getStageTooltip(stageKey: string, stageName?: string): string | undefined {
  const key = stageKey?.trim()
  if (key && STAGE_TOOLTIPS[key]) return STAGE_TOOLTIPS[key]
  if (stageName) {
    const alias = STAGE_NAME_ALIASES[stageName.trim()]
    if (alias) return STAGE_TOOLTIPS[alias]
  }
  return undefined
}

export function getDocumentTypeTooltip(documentType: string): string | undefined {
  return DOCUMENT_TYPE_TOOLTIPS[documentType.trim()]
}

export function getAgentTooltip(agentId: string): string | undefined {
  return AGENT_TOOLTIPS[agentId.trim().toUpperCase()]
}
