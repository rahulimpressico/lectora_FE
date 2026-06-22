// ─── Wizard ───────────────────────────────────────────────────────────────────

export interface WizardData {
  description: string
  experienceLevel: 'new' | 'some' | 'experienced' | ''
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
  includeKnowledgeChecks: boolean
  outlineMode: 'upload' | 'generate' | null
  preferredChapters: string
  lessonStyle: 'short' | 'detailed'
}

export const DEFAULT_WIZARD_DATA: WizardData = {
  description: '',
  experienceLevel: '',
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
  includeKnowledgeChecks: true,
  outlineMode: 'generate',
  preferredChapters: '',
  lessonStyle: 'short',
}
