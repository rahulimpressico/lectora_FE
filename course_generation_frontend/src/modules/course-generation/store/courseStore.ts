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
  courseId: string
  courseType: string
  domain: string
  additionalContext: string
  finalOutputFormat: 'wrapped' | 'raw'

  /** Optional user-uploaded TO document (replaces AI generation when set). */
  toDocument: UploadedFile | null

  // ── Dynamic TO generation — course configuration ─────────────────────────
  /** Course duration selected by the user (1–5 hours). Required for dynamic TO. */
  durationHours: number | null
  /** Difficulty level selected by the user: 'basic' | 'intermediate' | 'advanced'. */
  difficultyLevel: string | null
  /** Word count target calculated from duration + difficulty. Sent to backend. */
  calculatedWordCount: number | null

  /** Target audience for the course — mandatory before generating a TO or course. */
  audience: string
  /** Optional special instructions the user provides before final course generation. */
  specialInstructions: string
  /** Course title — initialized from TO generation, editable by user. */
  courseTitle: string
  /** Rule family key detected by A0 (e.g. "insurance_ce"). Editable by user. */
  detectedRuleFamily: string

  // ── Actions ─────────────────────────────────────────────────────────────────
  setPhase: (phase: WorkflowPhase) => void
  setCourseTopic: (topic: string) => void
  setUploadFolder: (folder: string | null) => void
  setCustomToPrompt: (prompt: string) => void
  setCourseTypeHint: (hint: string) => void
  setAudience: (audience: string) => void
  setSpecialInstructions: (instructions: string) => void
  setDetectedRuleFamily: (family: string) => void
  setDurationHours: (hours: number | null) => void
  setDifficultyLevel: (level: string | null) => void
  setCourseId: (courseId: string) => void
  setCourseTitle: (courseTitle: string) => void
  setCourseType: (courseType: string) => void
  setDomain: (domain: string) => void
  setAdditionalContext: (context: string) => void
  setFinalOutputFormat: (format: 'wrapped' | 'raw') => void

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

// ── TO bidirectional sync ──────────────────────────────────────────────────────

/**
 * Fields that must stay in sync between `totals` and each `sections[i]`.
 * When either side changes the other is automatically updated.
 */
const TO_SYNC_FIELDS = new Set(['word_count', 'credit_hours'])
const TO_TOTALS_KEY   = 'totals'
const TO_SECTIONS_KEY = 'sections'

/**
 * Distributes `newTotal` proportionally across `sectionValues`.
 *
 * - Uses existing ratios when currentTotal > 0; falls back to even split.
 * - The last section absorbs the rounding remainder so the sum is always
 *   exactly `newTotal` (no off-by-one drift).
 * - `isFloat` keeps two decimal places (credit_hours); otherwise integers.
 */
function _distributeProportionally(
  newTotal: number,
  sectionValues: number[],
  isFloat: boolean,
): number[] {
  const n = sectionValues.length
  if (n === 0) return []

  const round = (v: number) =>
    isFloat ? Math.round(v * 100) / 100 : Math.round(v)

  const currentTotal = sectionValues.reduce((a, b) => a + b, 0)

  let distributed: number[]

  if (currentTotal === 0) {
    // Even distribution — all sections were 0
    const even = newTotal / n
    distributed = Array.from({ length: n }, () => round(even))
  } else {
    distributed = sectionValues.map((v) => round((newTotal * v) / currentTotal))
  }

  // Correct rounding remainder in last section so the sum is exact
  const headSum = distributed.slice(0, -1).reduce((a, b) => a + b, 0)
  distributed[n - 1] = isFloat
    ? Math.round((newTotal - headSum) * 100) / 100
    : newTotal - headSum

  return distributed
}

/**
 * Applies the bidirectional sync cascade after a field is written.
 *
 * - `totals.<field>` changed → redistribute proportionally across `sections[*].<field>`.
 * - `sections.<i>.<field>` changed → recalculate `totals.<field>` as the sum.
 *
 * Returns the already-updated `data` with the cascade applied, or the same
 * object when the changed path is not a sync-controlled field.
 */
function _applySyncCascade(
  data: JsonObject,
  path: string[],
  value: JsonValue,
): JsonObject {
  const field = path[path.length - 1]
  if (!TO_SYNC_FIELDS.has(field)) return data

  const numValue = Number(value)
  if (isNaN(numValue) || numValue < 0) return data

  const isFloat = field === 'credit_hours'

  // ── Totals → sections ────────────────────────────────────────────────────────
  if (path.length === 2 && path[0] === TO_TOTALS_KEY) {
    const sections = deepGet(data, [TO_SECTIONS_KEY])
    if (!Array.isArray(sections) || sections.length === 0) return data

    const sectionValues = sections.map((_, i) =>
      Number(deepGet(data, [TO_SECTIONS_KEY, String(i), field])) || 0,
    )

    const distributed = _distributeProportionally(numValue, sectionValues, isFloat)

    let newData = data
    for (let i = 0; i < sections.length; i++) {
      newData = deepSet(newData, [TO_SECTIONS_KEY, String(i), field], distributed[i])
    }
    return newData
  }

  // ── Section → totals ─────────────────────────────────────────────────────────
  if (path.length === 3 && path[0] === TO_SECTIONS_KEY) {
    const sections = deepGet(data, [TO_SECTIONS_KEY])
    if (!Array.isArray(sections)) return data

    const total = sections.reduce<number>((sum, _, i) => {
      return sum + (Number(deepGet(data, [TO_SECTIONS_KEY, String(i), field])) || 0)
    }, 0)

    const rounded = isFloat ? Math.round(total * 100) / 100 : total
    return deepSet(data, [TO_TOTALS_KEY, field], rounded)
  }

  return data
}

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
  audience:             'trained insurance agents',
  courseId:             '',
  courseTitle:          '',
  courseType:           'insurance',
  domain:               '',
  additionalContext:    '',
  finalOutputFormat:    'wrapped' as const,
  specialInstructions:  '',
  detectedRuleFamily:   '',
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
        setAudience: (audience) => set({ audience }),
        setSpecialInstructions: (instructions) => set({ specialInstructions: instructions }),
        setDetectedRuleFamily: (family) => set({ detectedRuleFamily: family }),
        setCourseId: (courseId) => set({ courseId }),
        setCourseTitle: (courseTitle) => set({ courseTitle }),
        setCourseType: (courseType) => set({ courseType }),
        setDomain: (domain) => set({ domain }),
        setAdditionalContext: (additionalContext) => set({ additionalContext }),
        setFinalOutputFormat: (finalOutputFormat) => set({ finalOutputFormat }),

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
            // Write the user's value first, then cascade the sync.
            const afterSet      = deepSet(s.toData, path, value)
            const afterCascade  = _applySyncCascade(afterSet, path, value)
            return {
              toData:          afterCascade,
              modifiedTOPaths: modified,
            }
          }),

        resetTOField: (path) =>
          set((s) => {
            if (!s.toData || !s.toOriginal) return s
            const original = deepGet(s.toOriginal, path) ?? null
            const modified = new Set(s.modifiedTOPaths)
            modified.delete(pathKey(path))

            let newData = deepSet(s.toData, path, original as JsonValue)
            const field = path[path.length - 1]

            if (TO_SYNC_FIELDS.has(field) && original !== null) {
              if (path.length === 2 && path[0] === TO_TOTALS_KEY) {
                // Resetting a total: restore all section values from original too.
                const sections = deepGet(s.toOriginal, [TO_SECTIONS_KEY])
                if (Array.isArray(sections)) {
                  for (let i = 0; i < sections.length; i++) {
                    const origVal =
                      deepGet(s.toOriginal, [TO_SECTIONS_KEY, String(i), field]) ?? 0
                    newData = deepSet(newData, [TO_SECTIONS_KEY, String(i), field], origVal)
                  }
                }
              } else if (path.length === 3 && path[0] === TO_SECTIONS_KEY) {
                // Resetting a section value: recalculate the total from current data.
                newData = _applySyncCascade(newData, path, original as JsonValue)
              }
            }

            return {
              toData:          newData,
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
