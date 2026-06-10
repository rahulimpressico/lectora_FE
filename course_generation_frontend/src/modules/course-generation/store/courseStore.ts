import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { deepSet, deepGet } from '../utils/deepUpdate'
import { calcWordCount } from '../utils/courseConfig'
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
 * Fields that must stay in sync between `totals` (or root-level equivalents)
 * and each `sections[i]`.  When either side changes the other is updated.
 *
 * Two layouts coexist depending on which backend path produced the TO:
 *   Layout A — nested:  to.totals.word_count  ↔  to.sections[i].word_count
 *   Layout B — flat:    to.total_word_count    ↔  to.sections[i].word_count
 *
 * _applySyncCascade handles both transparently.
 */
const TO_SYNC_FIELDS = new Set(['word_count', 'credit_hours'])
const TO_TOTALS_KEY   = 'totals'
const TO_SECTIONS_KEY = 'sections'

// Map root-level total field → section field (Layout B)
const ROOT_TOTAL_TO_SECTION: Record<string, string> = {
  total_word_count:    'word_count',
  total_credit_hours:  'credit_hours',
}
// Map section field → root-level total field (Layout B)
const SECTION_TO_ROOT_TOTAL: Record<string, string> = {
  word_count:    'total_word_count',
  credit_hours:  'total_credit_hours',
  credit_hour:   'total_credit_hours', // backend section field is singular
}

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
 * Handles two TO layouts:
 *   Layout A (nested):  totals.word_count     ↔ sections[i].word_count
 *   Layout B (flat):    total_word_count       ↔ sections[i].word_count
 *
 * In both cases the opposite side is recalculated to stay consistent.
 */
function _applySyncCascade(
  data: JsonObject,
  path: string[],
  value: JsonValue,
): JsonObject {
  const field = path[path.length - 1]
  const numValue = Number(value)
  if (isNaN(numValue) || numValue < 0) return data

  // ── Layout B: root-level total changed → redistribute to sections ─────────
  if (path.length === 1 && ROOT_TOTAL_TO_SECTION[field] !== undefined) {
    const sectionField = ROOT_TOTAL_TO_SECTION[field]
    const isFloat = sectionField === 'credit_hours'
    const sections = deepGet(data, [TO_SECTIONS_KEY])
    if (!Array.isArray(sections) || sections.length === 0) return data

    // Read section values; try both "credit_hours" and "credit_hour"
    const sectionValues = sections.map((_, i) => {
      const v = Number(deepGet(data, [TO_SECTIONS_KEY, String(i), sectionField]))
      if (!isNaN(v)) return v
      // Fallback for singular form used by some backend routes
      if (sectionField === 'credit_hours') {
        return Number(deepGet(data, [TO_SECTIONS_KEY, String(i), 'credit_hour'])) || 0
      }
      return 0
    })

    const distributed = _distributeProportionally(numValue, sectionValues, isFloat)
    let newData = data
    for (let i = 0; i < sections.length; i++) {
      newData = deepSet(newData, [TO_SECTIONS_KEY, String(i), sectionField], distributed[i])
      // Also keep singular variant in sync if it exists in the section
      if (sectionField === 'credit_hours') {
        const hasSingular = deepGet(data, [TO_SECTIONS_KEY, String(i), 'credit_hour']) !== undefined
        if (hasSingular) {
          newData = deepSet(newData, [TO_SECTIONS_KEY, String(i), 'credit_hour'], distributed[i])
        }
      }
    }
    return newData
  }

  // ── Layout A: nested totals changed → redistribute to sections ────────────
  if (path.length === 2 && path[0] === TO_TOTALS_KEY && TO_SYNC_FIELDS.has(field)) {
    const isFloat = field === 'credit_hours'
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

  // ── Section changed → update totals on BOTH layouts ───────────────────────
  if (path.length === 3 && path[0] === TO_SECTIONS_KEY &&
      (TO_SYNC_FIELDS.has(field) || SECTION_TO_ROOT_TOTAL[field] !== undefined)) {
    const sections = deepGet(data, [TO_SECTIONS_KEY])
    if (!Array.isArray(sections)) return data

    // Canonical field name used for summing (normalise credit_hour → credit_hours)
    const canonicalField = field === 'credit_hour' ? 'credit_hours' : field
    const isFloat = canonicalField === 'credit_hours'

    const total = sections.reduce<number>((sum, _, i) => {
      // Accept both "credit_hours" and "credit_hour" variants
      let v = Number(deepGet(data, [TO_SECTIONS_KEY, String(i), field]))
      if (isNaN(v) && field === 'credit_hour') {
        v = Number(deepGet(data, [TO_SECTIONS_KEY, String(i), 'credit_hours'])) || 0
      }
      return sum + (isNaN(v) ? 0 : v)
    }, 0)

    const rounded = isFloat ? Math.round(total * 100) / 100 : total

    let newData = data
    // Layout A: nested totals object
    if (TO_SYNC_FIELDS.has(canonicalField)) {
      newData = deepSet(newData, [TO_TOTALS_KEY, canonicalField], rounded)
    }
    // Layout B: root-level total field
    const rootField = SECTION_TO_ROOT_TOTAL[field]
    if (rootField && deepGet(data, [rootField]) !== undefined) {
      newData = deepSet(newData, [rootField], rounded)
    }
    return newData
  }

  return data
}

// calcWordCount is imported from courseConfig — no local duplicate needed.

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
  audience:             '',
  courseId:             '',
  courseTitle:          '',
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

        setDurationHours: (hours) =>
          set((s) => {
            const wordCount = calcWordCount(hours, s.difficultyLevel)
            return { durationHours: hours, calculatedWordCount: wordCount }
          }),

        setDifficultyLevel: (level) =>
          set((s) => {
            const wordCount = calcWordCount(s.durationHours, level)
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

            if (original !== null) {
              // Classify the reset target so we can keep both sides of the
              // bidirectional sync consistent with the original snapshot.

              // Layout A total: path = ['totals', <syncField>]
              const isNestedTotal = path.length === 2 && path[0] === TO_TOTALS_KEY && TO_SYNC_FIELDS.has(field)
              // Layout B total: path = ['total_word_count'] or ['total_credit_hours']
              const isRootTotal   = path.length === 1 && ROOT_TOTAL_TO_SECTION[field] !== undefined
              // Section value (either layout): path = ['sections', '<i>', <syncField>]
              const isSection     = path.length === 3 && path[0] === TO_SECTIONS_KEY &&
                                    (TO_SYNC_FIELDS.has(field) || SECTION_TO_ROOT_TOTAL[field] !== undefined)

              if (isNestedTotal || isRootTotal) {
                // Resetting a total: restore all section values from original too,
                // so the total and its sections are consistent without recalculating.
                const sectionField = isRootTotal ? ROOT_TOTAL_TO_SECTION[field] : field
                const sections = deepGet(s.toOriginal, [TO_SECTIONS_KEY])
                if (Array.isArray(sections)) {
                  for (let i = 0; i < sections.length; i++) {
                    const origVal = deepGet(s.toOriginal, [TO_SECTIONS_KEY, String(i), sectionField]) ?? 0
                    newData = deepSet(newData, [TO_SECTIONS_KEY, String(i), sectionField], origVal)
                  }
                }
              } else if (isSection) {
                // Resetting a single section value: let _applySyncCascade recompute
                // the totals from the now-restored section value so they stay accurate.
                newData = _applySyncCascade(newData, path, original as JsonValue)
              }
              // For any other field (not a sync-tracked total or section), the
              // deepSet above already restored the value — no cascade needed.
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
        partialize: (s) => {
          if (s.activeJobId) {
            return { activeJobId: s.activeJobId, phase: s.phase }
          }
          if (s.phase === 'three-panel' && s.generatedToBlobPath) {
            return {
              phase: s.phase,
              generatedToBlobPath: s.generatedToBlobPath,
            }
          }
          return {}
        },
      },
    ),
    { name: 'course-store' },
  ),
)
