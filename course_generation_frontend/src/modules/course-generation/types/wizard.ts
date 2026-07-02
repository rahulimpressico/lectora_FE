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
  includeScenarios: boolean
  includeCaseStudies: boolean
  includeExamples: boolean
  includeKnowledgeChecks: boolean
  outlineMode: 'upload' | 'generate' | 'paste' | null
  outlinePasteText: string
  preferredChapters: string
  lessonStyle: 'short' | 'detailed'
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
  includeScenarios: true,
  includeCaseStudies: true,
  includeExamples: true,
  includeKnowledgeChecks: true,
  outlineMode: 'generate',
  outlinePasteText: '',
  preferredChapters: '',
  lessonStyle: 'short',
}
