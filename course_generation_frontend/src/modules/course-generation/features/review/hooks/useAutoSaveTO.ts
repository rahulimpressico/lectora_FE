import { useCallback, useEffect, useRef, useState } from 'react'
import { saveTrainingOutline } from '@/api/course-generation/api'
import { useCourseStore } from '../../../store/courseStore'

const DEBOUNCE_MS = 1_500
const SAVED_INDICATOR_MS = 3_000

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface AutoSaveState {
  status: SaveStatus
  saveError: string | null
  retry: () => void
}

/**
 * Debounced auto-save for the Training Outline.
 *
 * Behaviour:
 * - Waits DEBOUNCE_MS after the last `toData` change before saving.
 * - Only saves when `generatedToBlobPath` is set (needed for the backend target).
 * - Sequential: a second save cannot start until the first completes; if `toData`
 *   changed during an in-flight save, a follow-up save fires immediately after.
 * - Captures the latest store values via refs so the debounced callback never
 *   closes over a stale snapshot.
 * - Shows "Saved" for SAVED_INDICATOR_MS then returns to idle.
 */
export function useAutoSaveTO(): AutoSaveState {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Refs that always hold the latest store values ─────────────────────────
  // Updated synchronously on every store change via Zustand's subscribe so that
  // the debounced save callback always sees the most recent data even though it
  // was scheduled 1.5 s ago.
  const latestToRef = useRef(useCourseStore.getState().toData)
  const latestRulesRef = useRef(useCourseStore.getState().rulesData)
  const blobPathRef = useRef(useCourseStore.getState().generatedToBlobPath)

  useEffect(
    () =>
      useCourseStore.subscribe((s) => {
        latestToRef.current = s.toData
        latestRulesRef.current = s.rulesData
        blobPathRef.current = s.generatedToBlobPath
      }),
    [],
  )

  // ── Save state ────────────────────────────────────────────────────────────
  // `lastSavedSerialRef` — JSON string of the TO that was last successfully
  // written to the backend; compared before each save to skip no-op writes.
  const lastSavedSerialRef = useRef<string | null>(null)

  // Sequential-save guards: no two saves run concurrently.
  const isSavingRef = useRef(false)
  const pendingSaveRef = useRef(false) // true if toData changed while saving

  // Timer handles
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Core save function ────────────────────────────────────────────────────

  const doSave = useCallback(async () => {
    const blobPath = blobPathRef.current
    const to = latestToRef.current
    const rules = latestRulesRef.current

    // Nothing to save
    if (!blobPath || !to) return

    const serial = JSON.stringify(to)
    if (serial === lastSavedSerialRef.current) return // no change since last save

    // A save is already in-flight — flag for a follow-up run after it completes
    if (isSavingRef.current) {
      pendingSaveRef.current = true
      return
    }

    isSavingRef.current = true
    setStatus('saving')
    setSaveError(null)

    try {
      await saveTrainingOutline(
        blobPath,
        to as Record<string, unknown>,
        rules as Record<string, unknown> | null,
      )
      // Snapshot what we saved so the next call can skip a no-op write
      lastSavedSerialRef.current = serial
      setStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(
        () => setStatus((s) => (s === 'saved' ? 'idle' : s)),
        SAVED_INDICATOR_MS,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Auto-save failed. Changes are kept locally.'
      setSaveError(message)
      setStatus('error')
    } finally {
      isSavingRef.current = false
      // If toData changed during this save, run again immediately with the latest value
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        void doSave()
      }
    }
  }, []) // stable — all live values accessed through refs

  // ── Reactive subscription: debounce on toData / blobPath changes ──────────

  const toData = useCourseStore((s) => s.toData)
  const generatedToBlobPath = useCourseStore((s) => s.generatedToBlobPath)

  useEffect(() => {
    // Auto-save only makes sense when there is a backend blob to write to
    if (!generatedToBlobPath || !toData) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void doSave(), DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [toData, generatedToBlobPath, doSave])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    },
    [],
  )

  const retry = useCallback(() => void doSave(), [doSave])

  return { status, saveError, retry }
}
