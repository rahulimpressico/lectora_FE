import type { JsonObject, SourceAnalysis } from '../../../../types'

export interface GenerateTimedOutlineBody {
  courseTitle?: string
  courseDescription?: string
  courseType?: string
  courseDuration?: string
  targetAudience?: string
  skillLevel?: string
  requiredTopics?: string[]
  learningObjectives?: string[]
  sourceMaterials?: string[]
  sourceAnalyses?: SourceAnalysis[]
  preferredChapters?: number
  lessonStyle?: 'short' | 'detailed'
}

export interface GenerateTimedOutlineResponse {
  to: JsonObject
  rules: JsonObject | null
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

export interface SaveTOResponse {
  blobPath: string
}
