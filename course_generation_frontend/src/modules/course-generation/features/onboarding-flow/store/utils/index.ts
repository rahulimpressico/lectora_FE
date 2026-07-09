import { deepSet, deepGet } from '../../../../utils/deepUpdate'
import { WORDS_PER_CREDIT_HOUR } from '../../../../utils/courseConfig'
import type {
  SourceAnalysis,
  UploadedFile,
  WorkflowPhase,
  JsonObject,
  JsonValue,
  JobResponse,
  S1ValidationResult,
  WizardData,
} from '../../../../types'
import { DEFAULT_WIZARD_DATA } from '../../../../types/wizard'
import type { CourseState } from '../types/index'

// ── Path helpers ────────────────────────────────────────────────────────────
export const pathKey = (path: string[]) => path.join('.')

// ── TO sync — NAIC CE formula constants ───────────────────────────────────────
/** 180 words = 1 reading minute (NAIC standard) */
export const WORDS_PER_MINUTE = 180
/** 50 minutes = 1 CE credit hour (NAIC standard) */
export const MINUTES_PER_CREDIT_HOUR = 50
// WORDS_PER_CREDIT_HOUR (9 000) is imported from courseConfig — single source of truth

export const TO_TOTALS_KEY = 'totals'
export const TO_SECTIONS_KEY = 'sections'

/**
 * The three fields linked by NAIC CE formulas.
 * Changing any one triggers derivation of the other two at the same level,
 * plus vertical redistribution/summation across totals ↔ sections.
 */
export const TO_TRIO = new Set(['word_count', 'minutes', 'credit_hours'])

/** Decimal precision per canonical field name. */
export const FIELD_PRECISION: Record<string, number> = {
  word_count:         0,   // integer words
  minutes:            2,   // e.g. 12.22 min
  duration_minutes:   2,   // alias used by backend _clean_sections
  credit_hours:       3,   // e.g. 0.244 CE hours
  credit_hour:        3,   // singular alias used by some backend routes
  total_word_count:   0,
  total_minutes:      2,
  total_credit_hours: 3,
}

export function _prec(field: string): number { return FIELD_PRECISION[field] ?? 2 }

export function _round(v: number, decimals: number): number {
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}

/** Normalise any TO field name to the canonical trio key used internally. */
export function _toBaseField(field: string): string {
  if (field === 'credit_hour') return 'credit_hours'
  // Backend _clean_sections renames "minutes" → "duration_minutes" in section objects.
  if (field === 'duration_minutes') return 'minutes'
  if (field.startsWith('total_')) return field.slice(6) // strip 'total_'
  return field
}

/** True when `field` is a root-level flat total (Layout B). */
export function _isRootTotalField(field: string): boolean {
  return field === 'total_word_count' || field === 'total_minutes' || field === 'total_credit_hours'
}

/**
 * Given one canonical trio member and its value, derive the other two
 * using NAIC CE formulas.
 */
export function _deriveCompanions(baseField: string, value: number): Record<string, number> {
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
export function _readSectionField(data: JsonObject, idx: number, baseField: string): number {
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
export function _writeSectionField(
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
export function _distributeProportionally(
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
export function _applySyncCascade(
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

/**
 * Rebuilds `toData` for a "reset field to original" action.
 *
 * For a plain field this is just a `deepSet` restoring the original value.
 * For a trio field on a total, all sections plus both total layouts are
 * restored from the original snapshot so the total/section relationship
 * stays consistent. For a trio field on a section, the sync cascade is
 * re-applied with the restored value so totals recalculate.
 */
export function restoreToFieldPath(
  toData: JsonObject,
  toOriginal: JsonObject,
  path: string[],
): JsonObject {
  const original = deepGet(toOriginal, path) ?? null
  let newData = deepSet(toData, path, original as JsonValue)

  const field = path[path.length - 1]
  const baseField = _toBaseField(field)
  if (original === null || !TO_TRIO.has(baseField)) return newData

  const isNestedTotal = path.length === 2 && path[0] === TO_TOTALS_KEY
  const isRootTotal   = path.length === 1 && _isRootTotalField(field)
  const isSection     = path.length === 3 && path[0] === TO_SECTIONS_KEY

  if (isNestedTotal || isRootTotal) {
    // Resetting a total: restore ALL trio fields for all sections from
    // the original snapshot so the total and sections are consistent.
    const sections = deepGet(toOriginal, [TO_SECTIONS_KEY])
    if (Array.isArray(sections)) {
      for (let i = 0; i < sections.length; i++) {
        for (const tf of TO_TRIO) {
          const origVal = deepGet(toOriginal, [TO_SECTIONS_KEY, String(i), tf])
          if (origVal !== undefined) {
            newData = deepSet(newData, [TO_SECTIONS_KEY, String(i), tf], origVal)
          }
          // Restore credit_hour singular too
          if (tf === 'credit_hours') {
            const singularOrig = deepGet(toOriginal, [TO_SECTIONS_KEY, String(i), 'credit_hour'])
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
      const origNestedVal = deepGet(toOriginal, [TO_TOTALS_KEY, tf])
      if (origNestedVal !== undefined) {
        newData = deepSet(newData, [TO_TOTALS_KEY, tf], origNestedVal)
      }
      const origRootVal = deepGet(toOriginal, [`total_${tf}`])
      if (origRootVal !== undefined) {
        newData = deepSet(newData, [`total_${tf}`], origRootVal)
      }
    }
  } else if (isSection) {
    // Resetting a section value: recompute totals from the restored section
    newData = _applySyncCascade(newData, path, original as JsonValue)
  }

  return newData
}

// ── Default state ────────────────────────────────────────────────────────────

/** Non-action slice of `CourseState`. Fresh object per call — Sets are never shared. */
export function createInitialState() {
  return {
    phase:              'welcome' as WorkflowPhase,
    rawDocuments:       [] as UploadedFile[],
    activeFileId:       null as string | null,
    previewOpen:        false,
    previewFileId:      null as string | null,
    toData:             null as JsonObject | null,
    updatedToData:      null as JsonObject | null,
    rulesData:          null as JsonObject | null,
    updatedRulesData:   null as JsonObject | null,
    modifiedTOPaths:    new Set<string>(),
    modifiedRulesPaths: new Set<string>(),
    activeJob:            null as JobResponse | null,
    activeJobId:          null as string | null,
    isGeneratingTO:       false,
    generatedToBlobPath:  null as string | null,
    courseTopic:          '',
    uploadFolder:         null as string | null,
    customToPrompt:       '',
    courseTypeHint:       '',
    audience:             '',
    courseId:             null as string | null,
    courseCode:           null as string | null,
    courseTitle:          '',
    detectedRuleFamily:   '',
    toDocument:           null as UploadedFile | null,
    uploadedOutlineJson:    null as JsonObject | null,
    wizardData:           { ...DEFAULT_WIZARD_DATA } as WizardData,
    durationHours:        null as number | null,
    difficultyLevel:      null as string | null,
    calculatedWordCount:  null as number | null,
    sourceAnalyses:            [] as SourceAnalysis[],
    sourceAnalysesCacheKey:    null as string | null,
    toS1Validation:            null as S1ValidationResult | null,
    hasHydrated:               false,
  }
}

// ── Persistence (partialize) helpers ────────────────────────────────────────

/** localStorage key the zustand `persist` middleware writes the course store under. */
export const COURSE_STORE_STORAGE_KEY = 'course-workflow-v5'

/**
 * Reads TO / Rule Pack straight out of localStorage, bypassing zustand
 * persist's own async rehydration entirely. Used by the three-panel view so
 * it never depends on the store's `hasHydrated` flag to display data that's
 * already sitting on disk.
 *
 * Returns both the original (`toData`/`rulesData`) and the user's edit draft
 * (`updatedToData`/`updatedRulesData`, `null` when no edits have been made).
 */
export function readPersistedTOAndRules(): {
  toData: JsonObject | null
  updatedToData: JsonObject | null
  rulesData: JsonObject | null
  updatedRulesData: JsonObject | null
} | null {
  try {
    const raw = localStorage.getItem(COURSE_STORE_STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw)?.state
    if (!state) return null
    return {
      toData: state.toData ?? null,
      updatedToData: state.updatedToData ?? null,
      rulesData: state.rulesData ?? null,
      updatedRulesData: state.updatedRulesData ?? null,
    }
  } catch {
    return null
  }
}

/** Strips non-serialisable `File` objects and large `previewHtml` strings. */
function stripFileFields<T extends { file?: unknown; previewHtml?: unknown }>(item: T): Omit<T, 'file' | 'previewHtml'> {
  const rest: Record<string, unknown> = { ...item }
  delete rest.file
  delete rest.previewHtml
  return rest as Omit<T, 'file' | 'previewHtml'>
}

/** Only keep files that have been successfully uploaded (have a blobPath) so a stale "uploading" entry doesn't re-appear on restore. */
export function sanitizePersistedRawDocuments(rawDocuments: UploadedFile[]) {
  return rawDocuments
    .filter((d) => d.status === 'success' && d.blobPath)
    .map(stripFileFields)
}

export function sanitizePersistedToDocument(toDocument: UploadedFile | null) {
  return toDocument ? stripFileFields(toDocument) : null
}

/** Base persisted shape — common to every phase. */
export function buildBasePersistedState(s: CourseState) {
  return {
    phase: s.phase,
    // Course configuration
    courseTitle:         s.courseTitle,
    // Course-basic identifiers from POST /api/course-basic — form fields are
    // re-fetched from GET /api/course-basic/{courseId} when needed.
    courseId:            s.courseId,
    courseCode:          s.courseCode,
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
    rawDocuments:        sanitizePersistedRawDocuments(s.rawDocuments),
    // TO + Rules JSON (present once generation has run).
    // `toData`/`rulesData` are the original generation; `updatedToData`/
    // `updatedRulesData` are the user's edit draft (null if unedited).
    toData:              s.toData,
    updatedToData:       s.updatedToData,
    rulesData:           s.rulesData,
    updatedRulesData:    s.updatedRulesData,
    modifiedTOPaths:     Array.from(s.modifiedTOPaths),
    modifiedRulesPaths:  Array.from(s.modifiedRulesPaths),
    generatedToBlobPath: s.generatedToBlobPath,
    toDocument:          sanitizePersistedToDocument(s.toDocument),
    uploadedOutlineJson: s.uploadedOutlineJson,
    // Source analysis results (computed at Materials step Next time)
    sourceAnalyses:           s.sourceAnalyses,
    sourceAnalysesCacheKey:   s.sourceAnalysesCacheKey,
  }
}

/**
 * Selects the slice of `CourseState` to persist to localStorage, based on
 * the current phase / in-flight job:
 *  - `pipeline` / `course-editor` with an active job: base + `activeJobId`
 *    (so SSE can reconnect and back-navigation can restore the three-panel).
 *  - Otherwise: base (wizard/welcome state survives refresh).
 */
export function selectPersistedState(s: CourseState) {
  const base = buildBasePersistedState(s)

  if (
    s.activeJobId &&
    (s.phase === 'pipeline' || s.phase === 'course-editor')
  ) {
    return { ...base, activeJobId: s.activeJobId }
  }

  return base
}

type PersistedCourseSlice = ReturnType<typeof buildBasePersistedState> & {
  activeJobId?: string | null
  modifiedTOPaths?: string[]
  modifiedRulesPaths?: string[]
  /** Pre-refactor field names — a session persisted before original/updated were split out. */
  toOriginal?: JsonObject | null
  rulesOriginal?: JsonObject | null
}

/**
 * Migrates a pre-refactor persisted slice (where `toData`/`rulesData` held
 * the live-edited copy and `toOriginal`/`rulesOriginal` held the pristine
 * baseline) into the current original/updated shape, so an existing session
 * doesn't appear to silently lose its in-progress edits after this change
 * ships. No-ops for anything already in the new shape.
 */
function migrateLegacyOriginalFields(rest: PersistedCourseSlice): PersistedCourseSlice {
  const migrated = { ...rest }
  if (rest.toOriginal !== undefined && migrated.updatedToData === undefined) {
    migrated.updatedToData = rest.toData ?? null
    migrated.toData = rest.toOriginal
  }
  if (rest.rulesOriginal !== undefined && migrated.updatedRulesData === undefined) {
    migrated.updatedRulesData = rest.rulesData ?? null
    migrated.rulesData = rest.rulesOriginal
  }
  delete migrated.toOriginal
  delete migrated.rulesOriginal
  return migrated
}

/** Merge persisted localStorage slice back into live store state (Sets, etc.). */
export function mergePersistedCourseState(
  current: CourseState,
  persisted: PersistedCourseSlice,
): CourseState {
  const { modifiedTOPaths, modifiedRulesPaths, activeJobId, ...rest } = migrateLegacyOriginalFields(persisted)
  return {
    ...current,
    ...rest,
    ...(activeJobId !== undefined ? { activeJobId } : {}),
    modifiedTOPaths: new Set(modifiedTOPaths ?? []),
    modifiedRulesPaths: new Set(modifiedRulesPaths ?? []),
  }
}
