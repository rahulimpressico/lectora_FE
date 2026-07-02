import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { deepSet, deepGet } from '../utils/deepUpdate'
import { calcWordCount, WORDS_PER_CREDIT_HOUR } from '../utils/courseConfig'
import type {
  S1ValidationResult,
  SourceAnalysis,
  UploadedFile,
  WorkflowPhase,
  JsonObject,
  JsonValue,
  JobResponse,
  WizardData,
} from '../types'
import { DEFAULT_WIZARD_DATA } from '../types/wizard'

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
  /**
   * Job ID of an in-progress TO-generation (A0) run.
   * Persisted to localStorage so the user can navigate away and return to the
   * upload screen without losing the loader / polling state.
   * Cleared when the job completes, fails, or is cancelled.
   */
  activeTOJobId: string | null
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
  /** Course title — initialized from TO generation, editable by user. */
  courseTitle: string
  /** Rule family key detected by A0 (e.g. "insurance_ce"). Editable by user. */
  detectedRuleFamily: string

  // ── Wizard ───────────────────────────────────────────────────────────────────
  /** Structured data collected by the Course Setup Wizard steps. */
  wizardData: WizardData

  // ── Source analysis ──────────────────────────────────────────────────────────
  /**
   * Per-document source analysis results computed when the user clicks
   * "Next: Objectives" on the Materials step.
   * Persisted to localStorage so they survive page refresh.
   * Passed to POST /documents/generate-to as sourceAnalyses.
   */
  sourceAnalyses: SourceAnalysis[]
  /**
   * Cache key for the current sourceAnalyses — a sorted JSON string of each
   * document's {blobPath, sourceRole, importance}. Used to skip re-calling
   * the analyze-source API when the user navigates back and forward.
   */
  sourceAnalysesCacheKey: string | null

  // ── S1 validation result (TO generation) ─────────────────────────────────────
  /**
   * S1 validation result from the most recent TO-generation run.
   * Persisted so the three-panel view can show a quality badge after navigation.
   * Cleared on reset.
   */
  toS1Validation: S1ValidationResult | null

  /** True when LO text changed after the last outline was generated. */
  outlineStaleFromLo: boolean
  /** True when pasted outline text changed after the last outline was generated. */
  outlineStaleFromPaste: boolean
  /** Snapshot of objectives when outline was last synced/generated. */
  objectivesAtLastOutlineSync: string[] | null
  /** Snapshot of pasted outline text when outline was last synced/generated. */
  outlinePasteTextAtLastSync: string | null

  // ── Actions ─────────────────────────────────────────────────────────────────
  setPhase: (phase: WorkflowPhase) => void
  setCourseTopic: (topic: string) => void
  setUploadFolder: (folder: string | null) => void
  setCustomToPrompt: (prompt: string) => void
  setCourseTypeHint: (hint: string) => void
  setAudience: (audience: string) => void
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

  setWizardData: (patch: Partial<WizardData>) => void
  setSourceAnalyses: (analyses: SourceAnalysis[], cacheKey?: string) => void
  setToS1Validation: (result: S1ValidationResult | null) => void

  setToDocument: (file: UploadedFile | null) => void
  setActiveJob: (job: JobResponse | null) => void
  setActiveJobId: (id: string | null) => void
  setActiveTOJobId: (id: string | null) => void
  setGeneratedToBlobPath: (path: string | null) => void
  markOutlineStaleFromObjectivesChange: (nextObjectives: string[]) => boolean
  markOutlineStaleFromPasteChange: (nextPasteText: string) => boolean
  clearOutlineStale: () => void
  syncOutlineObjectives: (objectives: string[]) => void
  reset: () => void
}

const pathKey = (path: string[]) => path.join('.')

// ── TO sync — NAIC CE formula constants ───────────────────────────────────────
/** 180 words = 1 reading minute (NAIC standard) */
const WORDS_PER_MINUTE        = 180
/** 50 minutes = 1 CE credit hour (NAIC standard) */
const MINUTES_PER_CREDIT_HOUR = 50
// WORDS_PER_CREDIT_HOUR (9 000) is imported from courseConfig — single source of truth

const TO_TOTALS_KEY   = 'totals'
const TO_SECTIONS_KEY = 'sections'

/**
 * The three fields linked by NAIC CE formulas.
 * Changing any one triggers derivation of the other two at the same level,
 * plus vertical redistribution/summation across totals ↔ sections.
 */
const TO_TRIO = new Set(['word_count', 'minutes', 'credit_hours'])

/** Decimal precision per canonical field name. */
const FIELD_PRECISION: Record<string, number> = {
  word_count:         0,   // integer words
  minutes:            2,   // e.g. 12.22 min
  duration_minutes:   2,   // alias used by backend _clean_sections
  credit_hours:       3,   // e.g. 0.244 CE hours
  credit_hour:        3,   // singular alias used by some backend routes
  total_word_count:   0,
  total_minutes:      2,
  total_credit_hours: 3,
}

function _prec(field: string): number { return FIELD_PRECISION[field] ?? 2 }

function _round(v: number, decimals: number): number {
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}

/** Normalise any TO field name to the canonical trio key used internally. */
function _toBaseField(field: string): string {
  if (field === 'credit_hour') return 'credit_hours'
  // Backend _clean_sections renames "minutes" → "duration_minutes" in section objects.
  if (field === 'duration_minutes') return 'minutes'
  if (field.startsWith('total_')) return field.slice(6) // strip 'total_'
  return field
}

/** True when `field` is a root-level flat total (Layout B). */
function _isRootTotalField(field: string): boolean {
  return field === 'total_word_count' || field === 'total_minutes' || field === 'total_credit_hours'
}

/**
 * Given one canonical trio member and its value, derive the other two
 * using NAIC CE formulas.
 */
function _deriveCompanions(baseField: string, value: number): Record<string, number> {
  switch (baseField) {
    case 'word_count':
      return {
        minutes:      _round(value / WORDS_PER_MINUTE,        _prec('minutes')),
        credit_hours: _round(value / WORDS_PER_CREDIT_HOUR,   _prec('credit_hours')),
      }
    case 'minutes':
      return {
        word_count:   _round(value * WORDS_PER_MINUTE,         _prec('word_count')),
        credit_hours: _round(value / MINUTES_PER_CREDIT_HOUR,  _prec('credit_hours')),
      }
    case 'credit_hours':
      return {
        word_count:   _round(value * WORDS_PER_CREDIT_HOUR,    _prec('word_count')),
        minutes:      _round(value * MINUTES_PER_CREDIT_HOUR,  _prec('minutes')),
      }
    default:
      return {}
  }
}

/** Read a section's trio field value, accepting all known aliases. */
function _readSectionField(data: JsonObject, idx: number, baseField: string): number {
  const v = Number(deepGet(data, [TO_SECTIONS_KEY, String(idx), baseField]))
  if (!isNaN(v)) return v
  // credit_hours / credit_hour alias
  if (baseField === 'credit_hours') {
    const v2 = Number(deepGet(data, [TO_SECTIONS_KEY, String(idx), 'credit_hour']))
    if (!isNaN(v2)) return v2
  }
  // minutes / duration_minutes alias (backend _clean_sections uses duration_minutes)
  if (baseField === 'minutes') {
    const v2 = Number(deepGet(data, [TO_SECTIONS_KEY, String(idx), 'duration_minutes']))
    if (!isNaN(v2)) return v2
  }
  return 0
}

/**
 * Write a section trio field, keeping all known aliases in sync.
 *
 * `credit_hours` — also writes `credit_hour` (singular) when present.
 * `minutes`      — also writes `duration_minutes` when present (backend alias).
 *                  If the section only has `duration_minutes` (no `minutes`),
 *                  writes there instead of creating a new `minutes` key.
 */
function _writeSectionField(
  newData: JsonObject,
  origData: JsonObject,
  idx: number,
  baseField: string,
  value: number,
): JsonObject {
  let d = newData

  if (baseField === 'minutes') {
    const hasMinutes  = deepGet(origData, [TO_SECTIONS_KEY, String(idx), 'minutes']) !== undefined
    const hasDuration = deepGet(origData, [TO_SECTIONS_KEY, String(idx), 'duration_minutes']) !== undefined
    // Write to whichever variant(s) the section already uses;
    // default to 'minutes' when neither exists yet.
    if (hasMinutes || (!hasMinutes && !hasDuration)) {
      d = deepSet(d, [TO_SECTIONS_KEY, String(idx), 'minutes'], value)
    }
    if (hasDuration) {
      d = deepSet(d, [TO_SECTIONS_KEY, String(idx), 'duration_minutes'], value)
    }
  } else {
    d = deepSet(d, [TO_SECTIONS_KEY, String(idx), baseField], value)
    if (baseField === 'credit_hours') {
      const hasSingular =
        deepGet(origData, [TO_SECTIONS_KEY, String(idx), 'credit_hour']) !== undefined
      if (hasSingular) {
        d = deepSet(d, [TO_SECTIONS_KEY, String(idx), 'credit_hour'], value)
      }
    }
  }

  return d
}

/**
 * Distributes `newTotal` proportionally across `existingValues`, rounding to
 * `precision` decimal places.  The last element absorbs rounding drift so the
 * sum is always exactly `newTotal`.
 */
function _distributeProportionally(
  newTotal: number,
  existingValues: number[],
  precision: number,
): number[] {
  const n = existingValues.length
  if (n === 0) return []
  const round = (v: number) => _round(v, precision)
  const currentSum = existingValues.reduce((a, b) => a + b, 0)

  const distributed = currentSum === 0
    ? Array.from({ length: n }, () => round(newTotal / n))
    : existingValues.map(v => round((newTotal * v) / currentSum))

  // Last section absorbs remainder so the sum equals newTotal exactly
  const headSum = distributed.slice(0, -1).reduce((a, b) => a + b, 0)
  distributed[n - 1] = round(newTotal - headSum)
  return distributed
}

/**
 * Full bidirectional cascade for the TO editor.
 *
 * Any change to {word_count, minutes, credit_hours} — whether at the total or
 * section level, and in either the nested (totals.*) or flat (total_*) layout —
 * triggers:
 *   1. Cross-field derivation: the other two fields are recalculated via NAIC
 *      CE formulas (180 wpm → 50 min/hr).
 *   2. Vertical sync: totals are distributed to sections (total → section) or
 *      summed from sections (section → total).
 *
 * Both Layout A (nested `totals.*`) and Layout B (root `total_*`) are updated.
 */
function _applySyncCascade(
  data: JsonObject,
  path: string[],
  value: JsonValue,
): JsonObject {
  const field = path[path.length - 1]
  const numValue = Number(value)
  if (isNaN(numValue) || numValue < 0) return data

  const baseField = _toBaseField(field)
  if (!TO_TRIO.has(baseField)) return data

  const isRootTotal   = path.length === 1 && _isRootTotalField(field)
  const isNestedTotal = path.length === 2 && path[0] === TO_TOTALS_KEY
  const isSection     = path.length === 3 && path[0] === TO_SECTIONS_KEY
  if (!isRootTotal && !isNestedTotal && !isSection) return data

  const sections = deepGet(data, [TO_SECTIONS_KEY])
  const n = Array.isArray(sections) ? sections.length : 0

  // ── Total changed → derive companion totals + distribute to sections ────────
  if (isRootTotal || isNestedTotal) {
    if (n === 0) return data

    const companions   = _deriveCompanions(baseField, numValue)
    const allTotals    = { [baseField]: numValue, ...companions }

    // Existing section values for proportional distribution
    const existingBase = Array.from({ length: n }, (_, i) =>
      _readSectionField(data, i, baseField),
    )
    const distributed = _distributeProportionally(
      numValue, existingBase, _prec(baseField),
    )

    let newData = data

    // Write all three totals for both layouts
    for (const [tf, tv] of Object.entries(allTotals)) {
      const rounded = _round(tv, _prec(tf))
      // Layout A: totals.X (write if key already exists OR this IS the nested path)
      if (isNestedTotal || deepGet(data, [TO_TOTALS_KEY, tf]) !== undefined) {
        newData = deepSet(newData, [TO_TOTALS_KEY, tf], rounded)
      }
      // Layout B: total_X (write if key already exists OR this IS the root path)
      if (isRootTotal || deepGet(data, [`total_${tf}`]) !== undefined) {
        newData = deepSet(newData, [`total_${tf}`], rounded)
      }
    }

    // Write sections: changed field distributed, companions derived per section
    for (let i = 0; i < n; i++) {
      const sectionBaseVal = distributed[i]
      newData = _writeSectionField(newData, data, i, baseField, sectionBaseVal)
      for (const [cf, cv] of Object.entries(_deriveCompanions(baseField, sectionBaseVal))) {
        newData = _writeSectionField(newData, data, i, cf, _round(cv, _prec(cf)))
      }
    }

    return newData
  }

  // ── Section changed → derive section companions + recalculate all totals ────
  if (isSection) {
    const idx = Number(path[1])
    if (isNaN(idx)) return data

    let newData = data

    // Derive companion fields for this section
    for (const [cf, cv] of Object.entries(_deriveCompanions(baseField, numValue))) {
      newData = _writeSectionField(newData, data, idx, cf, _round(cv, _prec(cf)))
    }

    // Sum all sections for each trio field and update totals on both layouts
    for (const tf of ['word_count', 'minutes', 'credit_hours'] as const) {
      const total = Array.from({ length: n }, (_, i) =>
        _readSectionField(newData, i, tf),
      ).reduce((sum, v) => sum + v, 0)

      const rounded = _round(total, _prec(tf))

      if (deepGet(data, [TO_TOTALS_KEY, tf]) !== undefined) {
        newData = deepSet(newData, [TO_TOTALS_KEY, tf], rounded)
      }
      if (deepGet(data, [`total_${tf}`]) !== undefined) {
        newData = deepSet(newData, [`total_${tf}`], rounded)
      }
    }

    return newData
  }

  return data
}

// calcWordCount is imported from courseConfig — no local duplicate needed.

const initialState = {
  phase:              'welcome' as WorkflowPhase,
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
  activeTOJobId:        null as string | null,
  generatedToBlobPath:  null as string | null,
  courseTopic:          '',
  uploadFolder:         null as string | null,
  customToPrompt:       '',
  courseTypeHint:       '',
  audience:             '',
  courseId:             '',
  courseTitle:          '',
  detectedRuleFamily:   '',
  toDocument:           null as UploadedFile | null,
  wizardData:           { ...DEFAULT_WIZARD_DATA } as WizardData,
  durationHours:        null as number | null,
  difficultyLevel:      null as string | null,
  calculatedWordCount:  null as number | null,
  sourceAnalyses:            [] as SourceAnalysis[],
  sourceAnalysesCacheKey:    null as string | null,
  toS1Validation:            null as S1ValidationResult | null,
  outlineStaleFromLo:        false,
  outlineStaleFromPaste:     false,
  objectivesAtLastOutlineSync: null as string[] | null,
  outlinePasteTextAtLastSync: null as string | null,
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
        setDetectedRuleFamily: (family) => set({ detectedRuleFamily: family }),
        setCourseId: (courseId) => set({ courseId }),
        setCourseTitle: (courseTitle) => set({ courseTitle }),

        setWizardData: (patch) =>
          set((s) => ({
            wizardData: {
              ...DEFAULT_WIZARD_DATA,
              ...s.wizardData,
              ...patch,
              ...(patch.objectives !== undefined && !Array.isArray(patch.objectives)
                ? { objectives: [] }
                : {}),
            },
          })),

        setSourceAnalyses: (analyses, cacheKey) => set({ sourceAnalyses: analyses, sourceAnalysesCacheKey: cacheKey ?? null }),

        setToS1Validation: (result) => set({ toS1Validation: result }),

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
          set((s) => ({
            toData:                    data,
            toOriginal:                original ?? data,
            modifiedTOPaths:           new Set(),
            outlineStaleFromLo:        false,
            outlineStaleFromPaste:     false,
            objectivesAtLastOutlineSync: [...s.wizardData.objectives],
            outlinePasteTextAtLastSync: s.wizardData.outlinePasteText?.trim() || null,
          })),

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
            const baseField = _toBaseField(field)

            if (original !== null && TO_TRIO.has(baseField)) {
              const isNestedTotal = path.length === 2 && path[0] === TO_TOTALS_KEY
              const isRootTotal   = path.length === 1 && _isRootTotalField(field)
              const isSection     = path.length === 3 && path[0] === TO_SECTIONS_KEY

              if (isNestedTotal || isRootTotal) {
                // Resetting a total: restore ALL trio fields for all sections from
                // the original snapshot so the total and sections are consistent.
                const sections = deepGet(s.toOriginal, [TO_SECTIONS_KEY])
                if (Array.isArray(sections)) {
                  for (let i = 0; i < sections.length; i++) {
                    for (const tf of TO_TRIO) {
                      const origVal = deepGet(s.toOriginal, [TO_SECTIONS_KEY, String(i), tf])
                      if (origVal !== undefined) {
                        newData = deepSet(newData, [TO_SECTIONS_KEY, String(i), tf], origVal)
                      }
                      // Restore credit_hour singular too
                      if (tf === 'credit_hours') {
                        const singularOrig = deepGet(s.toOriginal, [TO_SECTIONS_KEY, String(i), 'credit_hour'])
                        if (singularOrig !== undefined) {
                          newData = deepSet(newData, [TO_SECTIONS_KEY, String(i), 'credit_hour'], singularOrig)
                        }
                      }
                    }
                  }
                }
                // Also restore the other two total fields from original
                for (const tf of TO_TRIO) {
                  if (tf === baseField) continue
                  const origNestedVal = deepGet(s.toOriginal, [TO_TOTALS_KEY, tf])
                  if (origNestedVal !== undefined) {
                    newData = deepSet(newData, [TO_TOTALS_KEY, tf], origNestedVal)
                  }
                  const origRootVal = deepGet(s.toOriginal, [`total_${tf}`])
                  if (origRootVal !== undefined) {
                    newData = deepSet(newData, [`total_${tf}`], origRootVal)
                  }
                }
              } else if (isSection) {
                // Resetting a section value: recompute totals from the restored section
                newData = _applySyncCascade(newData, path, original as JsonValue)
              }
            }

            return { toData: newData, modifiedTOPaths: modified }
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

        setActiveTOJobId: (id) => set({ activeTOJobId: id }),

        setGeneratedToBlobPath: (path) => set({ generatedToBlobPath: path }),

        markOutlineStaleFromObjectivesChange: (nextObjectives) => {
          let invalidated = false
          set((s) => {
            if (!s.toData) return s

            const snapshot = s.objectivesAtLastOutlineSync ?? s.wizardData.objectives
            const changed =
              snapshot.length !== nextObjectives.length ||
              snapshot.some((item, index) => item.trim() !== (nextObjectives[index] ?? '').trim())

            if (!changed) return s

            invalidated = true
            return {
              toData:              null,
              toOriginal:          null,
              generatedToBlobPath: null,
              toS1Validation:      null,
              modifiedTOPaths:     new Set<string>(),
              outlineStaleFromLo:  true,
            }
          })
          return invalidated
        },

        markOutlineStaleFromPasteChange: (nextPasteText) => {
          let invalidated = false
          set((s) => {
            const normalizedNext = nextPasteText.trim()
            const snapshot = s.outlinePasteTextAtLastSync

            if (snapshot === null) {
              if (s.toData && normalizedNext) {
                invalidated = true
                return {
                  toData:              null,
                  toOriginal:          null,
                  generatedToBlobPath: null,
                  toS1Validation:      null,
                  modifiedTOPaths:     new Set<string>(),
                  outlineStaleFromPaste: true,
                }
              }
              return { outlinePasteTextAtLastSync: normalizedNext }
            }

            if (snapshot === normalizedNext) return s

            if (!s.toData) {
              return { outlinePasteTextAtLastSync: normalizedNext }
            }

            invalidated = true
            return {
              toData:              null,
              toOriginal:          null,
              generatedToBlobPath: null,
              toS1Validation:      null,
              modifiedTOPaths:     new Set<string>(),
              outlineStaleFromPaste: true,
            }
          })
          return invalidated
        },

        clearOutlineStale: () => set({ outlineStaleFromLo: false, outlineStaleFromPaste: false }),

        syncOutlineObjectives: (objectives) =>
          set((s) => {
            if (!s.toData || objectives.length === 0) return s

            const existing = s.toData.learning_objectives ?? s.toData.learningObjectives
            const existingList = Array.isArray(existing) ? (existing as string[]) : []
            const unchanged =
              existingList.length === objectives.length &&
              existingList.every((item, index) => item.trim() === (objectives[index] ?? '').trim())

            if (unchanged) return s

            return {
              toData: {
                ...s.toData,
                learning_objectives: [...objectives],
              },
            }
          }),

        reset: () =>
          set({
            ...initialState,
            modifiedTOPaths:    new Set(),
            modifiedRulesPaths: new Set(),
            toDocument:         null,
            durationHours:      null,
            difficultyLevel:    null,
            calculatedWordCount: null,
            toS1Validation:     null,
            outlineStaleFromLo: false,
            outlineStaleFromPaste: false,
            objectivesAtLastOutlineSync: null,
            outlinePasteTextAtLastSync: null,
          }),
      }),
      {
        name: 'course-workflow-v4',
        // ── Serialise rawDocuments safely ──────────────────────────────────────
        // `File` objects are not JSON-serialisable and `previewHtml` can be
        // several MB. Strip both. Only keep files that have been successfully
        // uploaded (have a blobPath) so a stale "uploading" entry doesn't
        // re-appear on restore.
        partialize: (s) => {
          const persistedDocs = s.rawDocuments
            .filter((d) => d.status === 'success' && d.blobPath)
            .map(({ file: _f, previewHtml: _h, ...rest }) => rest)

          // Base shape — common to every phase.
          const base = {
            phase: s.phase,
            // Course configuration
            courseTitle:         s.courseTitle,
            courseId:            s.courseId,
            courseTypeHint:      s.courseTypeHint,
            audience:            s.audience,
            durationHours:       s.durationHours,
            difficultyLevel:     s.difficultyLevel,
            calculatedWordCount: s.calculatedWordCount,
            courseTopic:         s.courseTopic,
            uploadFolder:        s.uploadFolder,
            customToPrompt:      s.customToPrompt,
            detectedRuleFamily:  s.detectedRuleFamily,
            wizardData:          s.wizardData,
            // Uploaded source documents (metadata only — no File object)
            rawDocuments:        persistedDocs,
            // TO + Rules JSON (present once generation has run)
            toData:              s.toData,
            toOriginal:          s.toOriginal,
            rulesData:           s.rulesData,
            rulesOriginal:       s.rulesOriginal,
            generatedToBlobPath: s.generatedToBlobPath,
            outlineStaleFromLo:  s.outlineStaleFromLo,
            outlineStaleFromPaste: s.outlineStaleFromPaste,
            objectivesAtLastOutlineSync: s.objectivesAtLastOutlineSync,
            outlinePasteTextAtLastSync: s.outlinePasteTextAtLastSync,
            // Source analysis results (computed at Materials step Next time)
            sourceAnalyses:           s.sourceAnalyses,
            sourceAnalysesCacheKey:   s.sourceAnalysesCacheKey,
          }

          // Pipeline / editor: also include the active job ID so SSE can
          // reconnect and the back-navigation can restore the three-panel.
          if (
            s.activeJobId &&
            (s.phase === 'pipeline' || s.phase === 'course-editor')
          ) {
            return { ...base, activeJobId: s.activeJobId }
          }

          // TO-generation in progress: keep the polling job ID.
          if (s.activeTOJobId) {
            return { ...base, activeTOJobId: s.activeTOJobId }
          }

          return base
        },
        merge: (persisted, current) => {
          const p = persisted as Partial<typeof current>
          return {
            ...current,
            ...p,
            wizardData: { ...DEFAULT_WIZARD_DATA, ...(p.wizardData ?? {}) },
            sourceAnalyses: Array.isArray(p.sourceAnalyses) ? p.sourceAnalyses : [],
            rawDocuments: Array.isArray(p.rawDocuments) ? p.rawDocuments : current.rawDocuments,
          }
        },
      },
    ),
    { name: 'course-store' },
  ),
)

/**
 * Wipe the persisted localStorage entry completely.
 * Call this alongside `reset()` when the user clicks "Start Over" so that
 * a hard refresh after that action still lands on the Welcome screen.
 */
export const clearCourseStorage = () => useCourseStore.persist.clearStorage()
