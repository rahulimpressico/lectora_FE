import type { AIOperationType } from './editor'

// ─── Context sent to backend with every Alia voice command ───────────────────

export interface AliaContextSection {
  id: string
  title: string
  level: 1 | 2 | 3
  sectionType: string
  wordCount: number
  order: number
  childIds: string[]
  snippet: string   // first ~80 words for fuzzy matching
}

export interface AliaContext {
  courseTitle: string
  courseType: string
  audience: string
  ruleFamily: string
  meta: {
    totalWordCount: number
    sectionCount: number
    chapterCount: number
    estimatedReadTime: string
  }
  sections: AliaContextSection[]
  // Editor awareness — lets the LLM resolve "this", "it", "the current section"
  activeSectionId: string | null      // Section currently selected/scrolled to in editor
  focusedSectionId: string | null     // Section Alia last acted on (conversational continuity)
  recentlyEditedSectionIds: string[]  // Sections with unsaved user edits
}

// ─── History kept for multi-turn continuity ───────────────────────────────────

export interface AliaHistoryTurn {
  role: 'user' | 'alia'
  text: string
}

// ─── Structured editor commands returned by /alia backend ────────────────────

export type AliaAction =
  | { type: 'AI_OP';           sectionId: string; operation: AIOperationType; userPrompt?: string }
  | { type: 'BATCH_AI_OP';     sectionIds: string[]; operation: AIOperationType; userPrompt?: string }
  | { type: 'REORDER';         newOrder: string[] }
  | { type: 'MOVE_SUBTOPIC';   subtopicId: string; toParentId: string }
  | { type: 'ADD_SECTION';     afterSectionId?: string; title: string }
  | { type: 'ADD_SUBTOPIC';    parentId: string; title: string }
  | { type: 'DELETE_SECTION';  sectionId: string }
  | { type: 'RENAME_SECTION';  sectionId: string; title: string }
  | { type: 'EDIT_SECTION';    sectionId: string; content: string }
  | { type: 'UPDATE_TITLE';    courseTitle: string }
  | { type: 'NAVIGATE';        sectionId: string }
  | { type: 'OPEN_PREVIEW' }
  | { type: 'DOWNLOAD_DOCX' }
  | { type: 'SAVE_AZURE' }

// ─── API request / response ───────────────────────────────────────────────────

export interface AliaRequest {
  message: string
  context: AliaContext
  history: AliaHistoryTurn[]
}

export interface AliaResponse {
  message: string
  action: AliaAction | null
  needs_confirm: boolean
  affected_section_ids: string[]
}

// ─── Voice states ─────────────────────────────────────────────────────────────

export type AliaVoiceState =
  | 'idle'
  | 'listening'    // mic open, capturing speech
  | 'processing'   // sent to backend, waiting
  | 'acting'       // dispatching action in editor
  | 'speaking'     // TTS response playing
  | 'error'
