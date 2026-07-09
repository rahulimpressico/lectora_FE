import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { buildPresetTrainingOutline } from '../../../data/presetTrainingOutline'
import { normalizeTrainingOutlineForPanel } from '../../review/utils/trainingOutlinePanel'
import { deepSet, deepGet } from '../../../utils/deepUpdate'
import { calcWordCount } from '../../../utils/courseConfig'
import type { CourseState } from './types/index'
import {
  pathKey,
  createInitialState,
  restoreToFieldPath,
  _applySyncCascade,
  selectPersistedState,
  mergePersistedCourseState,
  COURSE_STORE_STORAGE_KEY,
} from './utils/index'

const initialState = createInitialState()

export const useCourseStore = create<CourseState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // ── Workflow ────────────────────────────────────────────────────────────
        setPhase: (phase) => set({ phase }),

        // ── Course configuration ─────────────────────────────────────────────────
        setCourseTopic: (topic) => set({ courseTopic: topic }),
        setUploadFolder: (folder) => set({ uploadFolder: folder }),
        setCustomToPrompt: (prompt) => set({ customToPrompt: prompt }),
        setCourseTypeHint: (hint) => set({ courseTypeHint: hint }),
        setAudience: (audience) => set({ audience }),
        setDetectedRuleFamily: (family) => set({ detectedRuleFamily: family }),
        setCourseId: (courseId) => set({ courseId }),
        setCourseCode: (courseCode) => set({ courseCode }),
        setCourseTitle: (courseTitle) => set({ courseTitle }),

        setWizardData: (patch) =>
          set((s) => ({ wizardData: { ...s.wizardData, ...patch } })),

        setSourceAnalyses: (analyses, cacheKey) =>
          set({ sourceAnalyses: analyses, sourceAnalysesCacheKey: cacheKey ?? null }),

        setToS1Validation: (result) => set({ toS1Validation: result }),

        setDurationHours: (hours) =>
          set((s) => ({
            durationHours: hours,
            calculatedWordCount: calcWordCount(hours, s.difficultyLevel),
          })),

        setDifficultyLevel: (level) =>
          set((s) => ({
            difficultyLevel: level,
            calculatedWordCount: calcWordCount(s.durationHours, level),
          })),

        // ── Files ─────────────────────────────────────────────────────────────────
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

        // ── TO ────────────────────────────────────────────────────────────────────
        // `data` becomes the new original — any prior edit draft no longer
        // applies to it, so it's discarded along with the dirty-path set.
        setTOData: (data) =>
          set({
            toData:          data,
            updatedToData:   null,
            modifiedTOPaths: new Set(),
          }),

        updateTOField: (path, value) =>
          set((s) => {
            const base = s.updatedToData ?? s.toData
            if (!base) return s
            const modified = new Set(s.modifiedTOPaths)
            modified.add(pathKey(path))
            // Write the user's value first, then cascade the sync.
            const afterSet     = deepSet(base, path, value)
            const afterCascade = _applySyncCascade(afterSet, path, value)
            return {
              updatedToData:   afterCascade,
              modifiedTOPaths: modified,
            }
          }),

        resetTOField: (path) =>
          set((s) => {
            const base = s.updatedToData ?? s.toData
            if (!base || !s.toData) return s
            const modified = new Set(s.modifiedTOPaths)
            modified.delete(pathKey(path))
            const restored = restoreToFieldPath(base, s.toData, path)
            return {
              // No dirty paths left → the draft is identical to the original again.
              updatedToData:   modified.size > 0 ? restored : null,
              modifiedTOPaths: modified,
            }
          }),

        resetAllTOEdits: () =>
          set({ updatedToData: null, modifiedTOPaths: new Set() }),

        applyTODraft: (data) =>
          set({ updatedToData: data, modifiedTOPaths: new Set() }),

        // ── Rules ─────────────────────────────────────────────────────────────────
        // `data` becomes the new original — any prior edit draft no longer
        // applies to it, so it's discarded along with the dirty-path set.
        setRulesData: (data) =>
          set({
            rulesData:          data,
            updatedRulesData:   null,
            modifiedRulesPaths: new Set(),
          }),

        updateRulesField: (path, value) =>
          set((s) => {
            const base = s.updatedRulesData ?? s.rulesData
            if (!base) return s
            const modified = new Set(s.modifiedRulesPaths)
            modified.add(pathKey(path))
            return {
              updatedRulesData:   deepSet(base, path, value),
              modifiedRulesPaths: modified,
            }
          }),

        resetRulesField: (path) =>
          set((s) => {
            const base = s.updatedRulesData ?? s.rulesData
            if (!base || !s.rulesData) return s
            const original = deepGet(s.rulesData, path) ?? null
            const modified = new Set(s.modifiedRulesPaths)
            modified.delete(pathKey(path))
            const restored = deepSet(base, path, original)
            return {
              // No dirty paths left → the draft is identical to the original again.
              updatedRulesData:   modified.size > 0 ? restored : null,
              modifiedRulesPaths: modified,
            }
          }),

        resetAllRulesEdits: () =>
          set({ updatedRulesData: null, modifiedRulesPaths: new Set() }),

        applyRulesDraft: (data) =>
          set({ updatedRulesData: data, modifiedRulesPaths: new Set() }),

        // ── Job / artifacts ───────────────────────────────────────────────────────
        setToDocument: (file) => set({ toDocument: file }),
        setUploadedOutlineJson: (json) => set({ uploadedOutlineJson: json }),
        setActiveJob: (job) => set({ activeJob: job }),
        setActiveJobId: (id) => set({ activeJobId: id }),
        setIsGeneratingTO: (generating) => set({ isGeneratingTO: generating }),
        setGeneratedToBlobPath: (path) => set({ generatedToBlobPath: path }),

        // Backfills whichever of TO / Rule Pack is missing from the persisted
        // store (localStorage) without touching the piece that's already
        // present — e.g. the real generate-to API supplies `toData` but no
        // `rules`, so this only needs to seed `rulesData` in that case.
        hydratePresetTrainingOutline: () =>
          set((s) => {
            const needsTO = !s.toData
            const needsRules = !s.rulesData
            if (!needsTO && !needsRules) return s

            const { to, rules } = buildPresetTrainingOutline({
              courseTitle: s.courseTitle,
              courseTopic: s.courseTopic,
              audience: s.audience,
              courseTypeHint: s.courseTypeHint,
              durationHours: s.durationHours,
              learningObjectives: s.wizardData.objectives,
            })

            const patch: Partial<CourseState> = {}

            if (needsTO) {
              const normalizedTo = normalizeTrainingOutlineForPanel(to, s.courseTypeHint, s.courseCode)
              patch.toData = normalizedTo
              patch.updatedToData = null
              patch.modifiedTOPaths = new Set<string>()
              if (!s.courseTitle.trim() && typeof to.course_name === 'string') {
                patch.courseTitle = to.course_name
              }
              if (typeof to.rule_family === 'string' && to.rule_family) {
                patch.detectedRuleFamily = to.rule_family
              }
            }

            if (needsRules) {
              patch.rulesData = rules
              patch.updatedRulesData = null
              patch.modifiedRulesPaths = new Set<string>()
            }

            return patch
          }),

        // Backfills TO/Rule Pack (original + draft) directly from a
        // localStorage snapshot — see `readPersistedTOAndRules`. Only the
        // keys present in `snapshot` are written; everything else is
        // left untouched.
        hydrateFromLocalStorageSnapshot: (snapshot) =>
          set((s) => ({
            toData: snapshot.toData !== undefined ? snapshot.toData : s.toData,
            updatedToData: snapshot.updatedToData !== undefined ? snapshot.updatedToData : s.updatedToData,
            rulesData: snapshot.rulesData !== undefined ? snapshot.rulesData : s.rulesData,
            updatedRulesData:
              snapshot.updatedRulesData !== undefined ? snapshot.updatedRulesData : s.updatedRulesData,
          })),

        // ── Reset ─────────────────────────────────────────────────────────────────
        reset: () =>
          set({
            ...createInitialState(),
            toDocument:          null,
            uploadedOutlineJson: null,
            durationHours:       null,
            difficultyLevel:     null,
            calculatedWordCount: null,
            toS1Validation:      null,
          }),
      }),
      {
        name: COURSE_STORE_STORAGE_KEY,
        partialize: selectPersistedState,
        merge: (persisted, current) =>
          mergePersistedCourseState(
            current as CourseState,
            persisted as Parameters<typeof mergePersistedCourseState>[1],
          ),
        onRehydrateStorage: () => () => {
          useCourseStore.setState({ hasHydrated: true })
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
