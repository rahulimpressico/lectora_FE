import type { JsonObject } from '../../../../types'

export interface GenerateTimedOutlineBody {
  blobPaths: string[]
  courseTitle: string
  courseDescription: string
  durationHours: number
  calculatedWordCount: number
  audience: string
  learningObjectives: string[]
  requiredTopics: string[]
  courseTopic?: string
  difficulty?: string
  difficultyLevel?: string
  courseTypeHint?: string
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
}

export interface RegenerateTimedOutlineBody {
  currentTo: JsonObject
  regenerationPrompt?: string
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
