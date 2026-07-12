import type { JsonObject } from '../../../../types'

export interface GenerateTimedOutlineBody {
  blobPaths: string[]
  courseTitle: string
  courseDescription: string
  durationHours: number
  /** Optional override — the backend derives the target word count from durationHours + difficulty. */
  calculatedWordCount?: number
  audience: string
  learningObjectives: string[]
  requiredTopics: string[]
  courseTopic?: string
  difficulty?: string
  difficultyLevel?: string
  courseTypeHint?: string
  /** Optional override — the backend derives the rule family from courseTypeHint. */
  ruleFamily?: string
  experienceLevel?: string
  learnerOutcomes?: string
  tone?: string
  depth?: string
  emphasis?: string
  avoid?: string
  includeCaseStudies?: boolean
  includeExamples?: boolean
  includeKnowledgeChecks?: boolean
  preferredChapters?: number
  lessonStyle?: 'short' | 'detailed'
}

export interface GenerateTimedOutlineResponse {
  timedOutline: JsonObject
  validationPassed: boolean
  repairAttempts: number
  finalIssues: JsonObject[]
  /** Normalized rule-family key resolved from the course type (e.g. insurance_ce). */
  ruleFamily?: string | null
  /**
   * Complete content-generation rule pack selected by the backend from
   * rule_pack_config for this course type. Displayed in full in the rules
   * panel and persisted with the course run.
   */
  rulePack?: JsonObject | null
}

export interface RegenerateTimedOutlineBody {
  currentTo: JsonObject
  regenerationPrompt: string
  preferredChapters?: number
  lessonStyle?: 'short' | 'detailed'
}

export interface RegenerateTimedOutlineResponse {
  to: JsonObject
}

export interface UploadTimedOutlineResponse {
  to: JsonObject
  rules: JsonObject | null
}
