// ─── Course content structure returned by GET /jobs/{jobId}/course ────────────
export type SectionType = 'overview' | 'learning-objectives' | 'conclusion' | 'content'

// Structured paragraph block from A2 body_paragraphs
export interface BodyParagraph {
  /** Stable block id — assigned client-side when missing; required for AI round-trips. */
  id?: string
  type: string
  // text / heading_3 / heading_4 / important_callout / callout
  content?: string
  // important_callout / callout
  label?: string
  // bullet_list / numbered_list / sub_bullet_list
  items?: string[]
  // knowledge_check
  question?: string
  options?: string[]
  correct_answer?: string | number
  explanation?: string
  // table
  headers?: string[]
  rows?: string[][]
  caption?: string
}

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
  paragraphs?: BodyParagraph[]
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
  /**
   * Course-level learning objectives, read back from the job's stored
   * pipeline_input.json artifact. Also mirrored as the dedicated
   * `course-learning-objectives` section (sectionType 'learning-objectives')
   * in `sections` — per-section `learningObjectives` stay empty by design.
   */
  learningObjectives?: string[]
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
  sectionId: string
  operation: AIOperationType
  content: string
  /** Structured body blocks — preferred over flat content when present. */
  paragraphs?: BodyParagraph[]
  context?: string
  userPrompt?: string
  /** Hint for the model: keep block ids/types/order (default true). */
  preserveStructure?: boolean
}

export interface AIOperationResponse {
  sectionId: string
  operation: AIOperationType
  content: string
  paragraphs?: BodyParagraph[]
  processingTimeMs?: number
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
  pdfBlobPath?: string | null
  containerName: string
  savedAt?: string
  warning?: string | null
  /** Immutable version allocated by the backend for this save. */
  versionNumber?: number
  versionId?: string
  stateBlobPath?: string
}
