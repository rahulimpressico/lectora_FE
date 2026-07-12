import { useState, useRef, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { useQuery } from '@tanstack/react-query'
import { getCourseContent, downloadCourseArtifact, syncCourseContent } from '@/api/editor/api'
import { loadDraft, clearDraft, saveDraft } from '../../../store/courseEditorDraft'
import { useEditorStore } from '../../../store/editorStore'
import { useSaveToAzure } from './useSaveToAzure'
import { isExpiredJobError } from '@/api/errors'
import type { CourseContent } from '../../../types/editor'

export interface CourseEditorSessionOptions {
  jobId: string
  courseSlug?: string
  /** Called once when content is first set (draft or API). Use to capture initial section order. */
  onContentLoaded?: (content: CourseContent) => void
  /** Called when the job has expired (404 with expired-job error). */
  onExpiredJob?: () => void
}

/** True when the API payload should replace a locally cached draft. */
function shouldPreferApiOverDraft(draft: CourseContent, api: CourseContent): boolean {
  const draftAt = draft.generatedAt ?? ''
  const apiAt = api.generatedAt ?? ''

  if (apiAt && draftAt && apiAt > draftAt) return true
  if (apiAt && draftAt && apiAt < draftAt) return false

  // Same generation (or missing timestamps): take API when it has more
  // structure. Do NOT require a higher word count — meta.totalWordCount can
  // already match the full course while a stale draft still has fewer sections.
  if (api.sections.length > draft.sections.length) return true
  if ((api.meta.sectionCount ?? 0) > (draft.meta.sectionCount ?? 0)) return true
  if ((api.meta.chapterCount ?? 0) > (draft.meta.chapterCount ?? 0)) return true

  const draftIds = new Set(draft.sections.map((s) => s.id))
  return api.sections.some((s) => !draftIds.has(s.id))
}

export function useCourseEditorSession({
  jobId,
  courseSlug,
  onContentLoaded,
  onExpiredJob,
}: CourseEditorSessionOptions) {
  const { setCourseContent } = useEditorStore()
  // Subscribe to store slices that drive the auto-save effect
  const courseContent = useEditorStore((s) => s.courseContent)
  const sectionEditStates = useEditorStore((s) => s.sectionEditStates)

  const [draftChecked, setDraftChecked] = useState(false)
  const [draftExists, setDraftExists] = useState(false)
  const draftLoadedRef = useRef(false)
  const contentLoadedRef = useRef(false)
  const appliedFetchRef = useRef<CourseContent | null>(null)

  // Stable refs for optional callbacks — inline handlers in parents must not
  // retrigger content-loading effects (causes infinite setCourseContent loop).
  const onContentLoadedRef = useRef(onContentLoaded)
  onContentLoadedRef.current = onContentLoaded
  const onExpiredJobRef = useRef(onExpiredJob)
  onExpiredJobRef.current = onExpiredJob

  const [isDownloading, setIsDownloading] = useState(false)
  const [syncingBeforeSave, setSyncingBeforeSave] = useState(false)

  const { save: saveToAzure, reset: resetSaveToAzure, status: saveStatus, result: saveResult, errorMessage: saveError } = useSaveToAzure()

  const debouncedSave = useDebouncedCallback(saveDraft, 400)

  // ── Draft: resolve BEFORE applying API, so a slow IDB read cannot overwrite
  // a fresh API payload (race that left the editor stuck on 2 sections).
  useEffect(() => {
    let cancelled = false
    draftLoadedRef.current = false
    contentLoadedRef.current = false
    appliedFetchRef.current = null
    setDraftChecked(false)

    loadDraft(jobId).then((draft) => {
      if (cancelled) return
      if (draft) {
        setCourseContent(draft.content)
        draftLoadedRef.current = true
        contentLoadedRef.current = true
        setDraftExists(true)
        onContentLoadedRef.current?.(draft.content)
      }
      setDraftChecked(true)
    })
    return () => {
      cancelled = true
      debouncedSave.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  // ── API fetch (waits for draft check so ordering is draft → compare → API) ─
  const { data: fetchedContent, isLoading, error } = useQuery({
    queryKey: ['course-content', jobId, courseSlug ?? ''],
    queryFn: () => getCourseContent(jobId, courseSlug),
    enabled: !!jobId && draftChecked,
    staleTime: 5 * 60_000,
    refetchOnMount: 'always',
    retry: 2,
  })

  useEffect(() => {
    if (!draftChecked || !fetchedContent) return
    // Skip when effect re-runs due to parent re-render; still apply on refetch (new reference).
    if (appliedFetchRef.current === fetchedContent) return

    if (draftLoadedRef.current) {
      const draftContent = useEditorStore.getState().courseContent
      if (draftContent && !shouldPreferApiOverDraft(draftContent, fetchedContent)) {
        appliedFetchRef.current = fetchedContent
        return
      }

      // Stale draft from an older/partial backend result — replace with API.
      draftLoadedRef.current = false
      debouncedSave.cancel()
      void clearDraft(jobId).then(() => setDraftExists(false))
    }

    appliedFetchRef.current = fetchedContent
    setCourseContent(fetchedContent)
    contentLoadedRef.current = true
    onContentLoadedRef.current?.(fetchedContent)
  }, [draftChecked, fetchedContent, setCourseContent, jobId, debouncedSave])

  useEffect(() => {
    if (!error || !isExpiredJobError(error)) return
    onExpiredJobRef.current?.()
  }, [error])

  // ── Auto-save: write to IDB after any store mutation ──────────────────────
  // sectionEditStates is a dep so inline edits (not yet "Saved") also trigger auto-save
  useEffect(() => {
    if (!draftChecked || !courseContent) return
    const snapshot = useEditorStore.getState().getCourseSnapshot()
    if (snapshot) {
      debouncedSave(jobId, snapshot)
      setDraftExists(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseContent, sectionEditStates, draftChecked, jobId])

  // ── Clear draft after successful Azure save ───────────────────────────────
  useEffect(() => {
    if (saveStatus === 'success') {
      void clearDraft(jobId).then(() => setDraftExists(false))
    }
  }, [saveStatus, jobId])

  // ── Download DOCX ─────────────────────────────────────────────────────────
  async function handleDownload() {
    if (!courseContent) return
    setIsDownloading(true)
    debouncedSave.cancel()
    try {
      // Full tree sync: order, subtopic moves, titles, and in-progress edits
      // must match the editor before DOCX is rebuilt from shared_state.
      const snapshot = useEditorStore.getState().getCourseSnapshot()
      if (snapshot) {
        await syncCourseContent(jobId, snapshot)
      }
      await downloadCourseArtifact(jobId)
      await clearDraft(jobId)
      setDraftExists(false)
    } finally {
      setIsDownloading(false)
    }
  }

  // ── Save to Azure ─────────────────────────────────────────────────────────
  async function handleSaveToAzure() {
    if (!courseContent) return
    setSyncingBeforeSave(true)
    try {
      const snapshot = useEditorStore.getState().getCourseSnapshot()
      if (snapshot) await syncCourseContent(jobId, snapshot)
    } catch {
      // Sync failed — proceed with save anyway
    } finally {
      setSyncingBeforeSave(false)
    }
    resetSaveToAzure()
    saveToAzure({
      jobId,
      courseTitle: courseContent.courseTitle,
      courseSlug,
    })
  }

  /** Cancel any pending debounced draft write (call before modal closes). */
  function cancelDraftSave() { debouncedSave.cancel() }

  return {
    draftChecked,
    draftExists,
    setDraftExists,
    isLoading,
    error,
    isDownloading,
    syncingBeforeSave,
    saveStatus,
    saveResult,
    saveError,
    handleDownload,
    handleSaveToAzure,
    resetSaveToAzure,
    cancelDraftSave,
  }
}
