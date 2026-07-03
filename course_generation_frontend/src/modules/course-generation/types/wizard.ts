// ─── Wizard ───────────────────────────────────────────────────────────────────

export interface WizardData {
  description: string
  requiredTopics: string[]
  experienceLevel: 'new' | 'some' | 'experienced' | ''
  selectedAudiences: string[]
  learnerOutcomes: string
  audienceNotes: string
  sourceNotes: string
  objectivesMode: 'provided' | 'ai-generated'
  objectives: string[]
  tone: string
  depth: 'overview' | 'balanced' | 'detailed'
  emphasis: string
  avoid: string
  includeCaseStudies: boolean
  includeExamples: boolean
  includeKnowledgeChecks: boolean
  outlineMode: 'upload' | 'generate' | null
  preferredChapters: string
  lessonStyle: 'short' | 'detailed'
}

export type ExperienceLevel = WizardData['experienceLevel']

export const EXPERIENCE_LEVEL_LABELS: Record<
  Exclude<ExperienceLevel, ''>,
  string
> = {
  new: 'New to Topic',
  some: 'Some Experience',
  experienced: 'Experienced',
}

export function formatExperienceLevel(level: ExperienceLevel): string {
  if (!level) return ''
  return EXPERIENCE_LEVEL_LABELS[level] ?? level
}

export const DEFAULT_WIZARD_DATA: WizardData = {
  description: '',
  requiredTopics: [],
  experienceLevel: '',
  selectedAudiences: [],
  learnerOutcomes: '',
  audienceNotes: '',
  sourceNotes: '',
  objectivesMode: 'provided',
  objectives: [],
  tone: '',
  depth: 'balanced',
  emphasis: '',
  avoid: '',
  includeCaseStudies: true,
  includeExamples: true,
  includeKnowledgeChecks: true,
  outlineMode: 'generate',
  preferredChapters: '',
  lessonStyle: 'short',
}
