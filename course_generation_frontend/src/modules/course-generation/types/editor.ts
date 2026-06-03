// ─── Course content structure returned by GET /jobs/{jobId}/course ────────────
export type SectionType = 'overview' | 'learning-objectives' | 'conclusion' | 'content'

export interface SectionImage {
  id: string
  fileName: string
  blobPath: string
  caption?: string | null
  altText?: string | null
}

export interface CourseSection {
  id: string
  title: string
  level: 1 | 2 | 3
  sectionType?: SectionType
  content: string
  learningObjectives: string[]
  wordCount: number
  hasKnowledgeCheck: boolean
  estimatedDuration?: string
  order: number
  parentId?: string
  children: CourseSection[]
  images?: SectionImage[]
}

export interface CourseContentMeta {
  totalWordCount: number
  sectionCount: number
  chapterCount: number
  estimatedReadTime: string
}

export interface CourseContent {
  jobId: string
  courseTitle: string
  courseType: string
  generatedAt: string
  meta: CourseContentMeta
  sections: CourseSection[]
}

// ─── AI operations on individual sections ─────────────────────────────────────
export type AIOperationType =
  | 'regenerate'
  | 'rewrite'
  | 'improve_tone'
  | 'summarize'
  | 'expand'
  | 'simplify'

export interface AIOperationConfig {
  type: AIOperationType
  label: string
  description: string
  icon: string
}

export interface AIOperationRequest {
  jobId: string
  sectionId: string
  operation: AIOperationType
  content: string
  context?: string
  userPrompt?: string
}

export interface AIOperationResponse {
  sectionId: string
  operation: AIOperationType
  content: string
  processingTimeMs: number
}

// ─── Per-section UI edit state ────────────────────────────────────────────────
export interface SectionEditState {
  isEditing: boolean
  isDirty: boolean
  currentContent: string
  originalContent: string
  isSaving: boolean
  isAIProcessing: boolean
  currentAIOperation?: AIOperationType
  isExpanded: boolean
}

// ─── Save to Azure ────────────────────────────────────────────────────────────
export interface SaveToAzureResponse {
  status: 'uploaded'
  jobId: string
  fileName: string
  blobPath: string
  containerName: string
  savedAt?: string
}
