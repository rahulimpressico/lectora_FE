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
            const afterSet     = deepSet(s.toData, path, value)
            const afterCascade = _applySyncCascade(afterSet, path, value)
            return {
              toData:          afterCascade,
              modifiedTOPaths: modified,
            }
          }),

        resetTOField: (path) =>
          set((s) => {
            if (!s.toData || !s.toOriginal) return s
            const modified = new Set(s.modifiedTOPaths)
            modified.delete(pathKey(path))
            return {
              toData:          restoreToFieldPath(s.toData, s.toOriginal, path),
              modifiedTOPaths: modified,
            }
          }),

        // ── Rules ─────────────────────────────────────────────────────────────────
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
              rulesData:          deepSet(s.rulesData, path, original),
              modifiedRulesPaths: modified,
            }
          }),

        // ── Job / artifacts ───────────────────────────────────────────────────────
        setToDocument: (file) => set({ toDocument: file }),
        setUploadedOutlineJson: (json) => set({ uploadedOutlineJson: json }),
        setActiveJob: (job) => set({ activeJob: job }),
        setActiveJobId: (id) => set({ activeJobId: id }),
        setIsGeneratingTO: (generating) => set({ isGeneratingTO: generating }),
        setGeneratedToBlobPath: (path) => set({ generatedToBlobPath: path }),

        hydratePresetTrainingOutline: () =>
          set((s) => {
            const { to, rules } = buildPresetTrainingOutline({
              courseTitle: s.courseTitle,
              courseTopic: s.courseTopic,
              audience: s.audience,
              courseTypeHint: s.courseTypeHint,
              durationHours: s.durationHours,
              learningObjectives: s.wizardData.objectives,
            })
            const normalizedTo = normalizeTrainingOutlineForPanel(to, s.courseTypeHint)
            const nextTitle =
              !s.courseTitle.trim() && typeof to.course_name === 'string'
                ? to.course_name
                : s.courseTitle
            const nextFamily =
              typeof to.rule_family === 'string' && to.rule_family
                ? to.rule_family
                : s.detectedRuleFamily

            return {
              toData: normalizedTo,
              toOriginal: normalizedTo,
              rulesData: rules,
              rulesOriginal: rules,
              modifiedTOPaths: new Set<string>(),
              modifiedRulesPaths: new Set<string>(),
              courseTitle: nextTitle,
              detectedRuleFamily: nextFamily,
            }
          }),

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
        name: 'course-workflow-v5',
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
