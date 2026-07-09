import type { SourceAnalysis } from "@/modules/course-generation/types"

export interface RegeneratePromptModalProps {
  open: boolean
  onConfirm: (prompt: string) => void
  onClose: () => void
}

export interface RegeneratePromptModalFormProps {
  onConfirm: (prompt: string) => void
  onClose: () => void
}

export interface EditableObjectivesListProps {
  objectives: string[]
  onChange: (objectives: string[]) => void
  onRegenerate?: () => void
  isRegenerating?: boolean
}





export interface GenerateLearningObjectivesBody {
  sourceMaterials?: string[]
  courseTitle?: string
  courseDescription?: string
  courseType?: string
  courseDuration?: string
  targetAudience?: string
  skillLevel?: string
  desiredOutcomes?: string
  certificationFocus?: string
  additionalInstructions?: string
  sourceAnalyses?: SourceAnalysis[]
  requiredTopics?: string[]
}

export interface LOValidationIssue {
  type: string
  message: string
  affected_objectives: string[]
  expected_action: string
}

export interface GenerateLearningObjectivesResponse {
  learningObjectives: string[]
  validationPassed: boolean
  repairAttempts: number
  finalIssues: LOValidationIssue[]
}

export interface RegenerateLearningObjectivesBody {
  currentObjectives: string[]
  regenerationPrompt: string
  courseTitle?: string
  courseType?: string
  courseDuration?: string
  skillLevel?: string
  targetAudience?: string
}

export interface RegenerateLearningObjectivesResponse {
  learningObjectives: string[]
}
