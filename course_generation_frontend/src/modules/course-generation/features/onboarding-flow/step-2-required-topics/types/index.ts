export interface RegeneratePromptModalProps {
  open: boolean
  onConfirm: (prompt: string) => void
  onClose: () => void
}

export interface RegeneratePromptModalFormProps {
  onConfirm: (prompt: string) => void
  onClose: () => void
}

export interface TopicChipProps {
  topic: string
  onRemove: () => void
  onEdit: (newValue: string) => void
}

export interface GenerateRequiredTopicsBody {
  courseTitle?: string
  courseDescription?: string
  courseType?: string
  courseDuration?: string
  targetAudience?: string
  skillLevel?: string
  learnerOutcomes?: string
}

export interface RTValidationIssue {
  type: string
  message: string
  affectedTopics: string[]
  expectedAction: string
}

export interface GenerateRequiredTopicsResponse {
  requiredTopics: string[]
  validationPassed: boolean
  repairAttempts: number
  finalIssues: RTValidationIssue[]
}

export interface RegenerateRequiredTopicsBody {
  currentTopics: string[]
  regenerationPrompt: string
}

export interface RegenerateRequiredTopicsResponse {
  requiredTopics: string[]
}
