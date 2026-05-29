import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { deepSet, deepGet } from '../utils/deepUpdate'
import type {
  UploadedFile,
  WorkflowPhase,
  JsonObject,
  JsonValue,
  JobResponse,
} from '../types'

interface CourseState {
  // ── Workflow ────────────────────────────────────────────────────────────────
  phase: WorkflowPhase

  // ── Files ───────────────────────────────────────────────────────────────────
  rawDocuments: UploadedFile[]
  activeFileId: string | null
  previewOpen: boolean
  previewFileId: string | null

  // ── TO + Rules ──────────────────────────────────────────────────────────────
  toData: JsonObject | null
  toOriginal: JsonObject | null
  rulesData: JsonObject | null
  rulesOriginal: JsonObject | null

  // ── Dirty tracking ──────────────────────────────────────────────────────────
  modifiedTOPaths: Set<string>
  modifiedRulesPaths: Set<string>

  // ── Job ─────────────────────────────────────────────────────────────────────
  activeJob: JobResponse | null
  /** Stable job ID used by pipeline + editor views after job creation. */
  activeJobId: string | null
  /** Blob path of the LLM-generated TO from the generate-to preview step.
   *  Passed as timedOutline.blobPath in POST /jobs so the pipeline reuses it. */
  generatedToBlobPath: string | null
  /** User-provided course topic — becomes uploaded-documents/{folder}/ in Azure Blob. */
  courseTopic: string
  /** Sanitized folder name returned by the server after first upload. */
  uploadFolder: string | null
  /** Optional custom prompt the user provides to guide TO generation. */
  customToPrompt: string
  /** Optional course/domain type hint (e.g. "Washington LTC Compliance Course"). */
  courseTypeHint: string

  /** Optional user-uploaded TO document (replaces AI generation when set). */
  toDocument: UploadedFile | null

  // ── Dynamic TO generation — course configuration ─────────────────────────
  /** Course duration selected by the user (1–5 hours). Required for dynamic TO. */
  durationHours: number | null
  /** Difficulty level selected by the user: 'basic' | 'intermediate' | 'advanced'. */
  difficultyLevel: string | null
  /** Word count target calculated from duration + difficulty. Sent to backend. */
  calculatedWordCount: number | null

  // ── Actions ─────────────────────────────────────────────────────────────────
  setPhase: (phase: WorkflowPhase) => void
  setCourseTopic: (topic: string) => void
  setUploadFolder: (folder: string | null) => void
  setCustomToPrompt: (prompt: string) => void
  setCourseTypeHint: (hint: string) => void
  setDurationHours: (hours: number | null) => void
  setDifficultyLevel: (level: string | null) => void

  addRawDocument: (file: UploadedFile) => void
  updateRawDocument: (id: string, patch: Partial<UploadedFile>) => void
  removeRawDocument: (id: string) => void
  setActiveFileId: (id: string | null) => void

  openPreview: (file: UploadedFile) => void
  closePreview: () => void

  setTOData: (data: JsonObject, original?: JsonObject) => void
  updateTOField: (path: string[], value: JsonValue) => void
  resetTOField: (path: string[]) => void

  setRulesData: (data: JsonObject, original?: JsonObject) => void
  updateRulesField: (path: string[], value: JsonValue) => void
  resetRulesField: (path: string[]) => void

  setToDocument: (file: UploadedFile | null) => void
  setActiveJob: (job: JobResponse | null) => void
  setActiveJobId: (id: string | null) => void
  setGeneratedToBlobPath: (path: string | null) => void
  reset: () => void
}

const pathKey = (path: string[]) => path.join('.')

/** Difficulty multipliers matching the backend NAIC CE formula. */
const DIFFICULTY_MULTIPLIERS: Record<string, number> = {
  basic:        1.0,
  intermediate: 1.25,
  advanced:     1.5,
}

/**
 * Calculate target word count from duration + difficulty.
 * Formula: (duration_hours × 9000) / multiplier
 */
function _calcWordCount(hours: number | null, level: string | null): number | null {
  if (hours == null || !level) return null
  const multiplier = DIFFICULTY_MULTIPLIERS[level.toLowerCase()] ?? 1.25
  return Math.round((hours * 9000) / multiplier)
}

const initialState = {
  phase:              'upload' as WorkflowPhase,
  rawDocuments:       [] as UploadedFile[],
  activeFileId:       null as string | null,
  previewOpen:        false,
  previewFileId:      null as string | null,
  toData:             null as JsonObject | null,
  toOriginal:         null as JsonObject | null,
  rulesData:          null as JsonObject | null,
  rulesOriginal:      null as JsonObject | null,
  modifiedTOPaths:    new Set<string>(),
  modifiedRulesPaths: new Set<string>(),
  activeJob:            null as JobResponse | null,
  activeJobId:          null as string | null,
  generatedToBlobPath:  null as string | null,
  courseTopic:          '',
  uploadFolder:         null as string | null,
  customToPrompt:       '',
  courseTypeHint:       '',
  toDocument:           null as UploadedFile | null,
  durationHours:        null as number | null,
  difficultyLevel:      null as string | null,
  calculatedWordCount:  null as number | null,
}

export const useCourseStore = create<CourseState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setPhase: (phase) => set({ phase }),

        setCourseTopic: (topic) => set({ courseTopic: topic }),
        setUploadFolder: (folder) => set({ uploadFolder: folder }),
        setCustomToPrompt: (prompt) => set({ customToPrompt: prompt }),
        setCourseTypeHint: (hint) => set({ courseTypeHint: hint }),

        setDurationHours: (hours) =>
          set((s) => {
            const wordCount = _calcWordCount(hours, s.difficultyLevel)
            return { durationHours: hours, calculatedWordCount: wordCount }
          }),

        setDifficultyLevel: (level) =>
          set((s) => {
            const wordCount = _calcWordCount(s.durationHours, level)
            return { difficultyLevel: level, calculatedWordCount: wordCount }
          }),

        addRawDocument: (file) =>
          set((s) => ({
            rawDocuments:  [...s.rawDocuments, file],
            activeFileId: s.activeFileId ?? file.id,
          })),

        updateRawDocument: (id, patch) =>
          set((s) => ({
            rawDocuments: s.rawDocuments.map((f) =>
              f.id === id ? { ...f, ...patch } : f,
            ),
          })),

        removeRawDocument: (id) =>
          set((s) => {
            const next     = s.rawDocuments.filter((f) => f.id !== id)
            const activeId = s.activeFileId === id ? (next[0]?.id ?? null) : s.activeFileId
            return { rawDocuments: next, activeFileId: activeId }
          }),

        setActiveFileId: (id) => set({ activeFileId: id }),

        openPreview: (file) =>
          set({ previewOpen: true, previewFileId: file.id }),
        closePreview: () =>
          set({ previewOpen: false, previewFileId: null }),

        // ── TO ────────────────────────────────────────────────────────────────
        setTOData: (data, original) =>
          set({
            toData:          data,
            toOriginal:      original ?? data,
            modifiedTOPaths: new Set(),
          }),

        updateTOField: (path, value) =>
          set((s) => {
            if (!s.toData) return s
            const modified = new Set(s.modifiedTOPaths)
            modified.add(pathKey(path))
            return {
              toData:          deepSet(s.toData, path, value),
              modifiedTOPaths: modified,
            }
          }),

        resetTOField: (path) =>
          set((s) => {
            if (!s.toData || !s.toOriginal) return s
            const original  = deepGet(s.toOriginal, path) ?? null
            const modified  = new Set(s.modifiedTOPaths)
            modified.delete(pathKey(path))
            return {
              toData:          deepSet(s.toData, path, original as JsonValue),
              modifiedTOPaths: modified,
            }
          }),

        // ── Rules ─────────────────────────────────────────────────────────────
        setRulesData: (data, original) =>
          set({
            rulesData:          data,
            rulesOriginal:      original ?? data,
            modifiedRulesPaths: new Set(),
          }),

        updateRulesField: (path, value) =>
          set((s) => {
            if (!s.rulesData) return s
            const modified = new Set(s.modifiedRulesPaths)
            modified.add(pathKey(path))
            return {
              rulesData:          deepSet(s.rulesData, path, value),
              modifiedRulesPaths: modified,
            }
          }),

        resetRulesField: (path) =>
          set((s) => {
            if (!s.rulesData || !s.rulesOriginal) return s
            const original = deepGet(s.rulesOriginal, path) ?? null
            const modified = new Set(s.modifiedRulesPaths)
            modified.delete(pathKey(path))
            return {
              rulesData:          deepSet(s.rulesData, path, original as JsonValue),
              modifiedRulesPaths: modified,
            }
          }),

        setToDocument: (file) => set({ toDocument: file }),

        setActiveJob: (job) => set({ activeJob: job }),

        setActiveJobId: (id) => set({ activeJobId: id }),

        setGeneratedToBlobPath: (path) => set({ generatedToBlobPath: path }),

        reset: () =>
          set({
            ...initialState,
            modifiedTOPaths:    new Set(),
            modifiedRulesPaths: new Set(),
            toDocument:         null,
            durationHours:      null,
            difficultyLevel:    null,
            calculatedWordCount: null,
          }),
      }),
      {
        name: 'course-workflow-v2',
        // Persist only the fields needed to reconnect after a page refresh.
        // If the user refreshes during pipeline/course-editor, we reattach to
        // the same job via SSE using the persisted jobId and phase.
        partialize: (s) =>
          s.activeJobId
            ? { activeJobId: s.activeJobId, phase: s.phase }
            : {},
      },
    ),
    { name: 'course-store' },
  ),
)
