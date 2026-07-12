/**
 * courseEditorDraft.ts
 *
 * Thin IndexedDB wrapper (via idb-keyval) that persists the in-progress editor
 * state keyed by jobId. Falls back gracefully when IndexedDB is unavailable.
 *
 * Key format: "lectora:course-draft:{jobId}"
 */

import { get, set, del } from 'idb-keyval'
import type { CourseContent } from '../types/editor'

const KEY_PREFIX = 'lectora:course-draft:'

export interface DraftRecord {
  content: CourseContent
  savedAt: string
  /**
   * True when the draft includes user edits that should survive refresh.
   * False/undefined means the draft is just a cached API snapshot and may be
   * replaced by a fresher backend response.
   */
  hasLocalEdits?: boolean
}

/** Persist a course draft keyed by jobId. Fails silently on error. */
export async function saveDraft(
  jobId: string,
  content: CourseContent,
  hasLocalEdits = false,
): Promise<void> {
  try {
    const record: DraftRecord = {
      content,
      savedAt: new Date().toISOString(),
      hasLocalEdits,
    }
    await set(`${KEY_PREFIX}${jobId}`, record)
  } catch {
    // IndexedDB unavailable or quota exceeded — fail silently
  }
}

/** Load a draft for the given jobId. Returns null if none exists or on error. */
export async function loadDraft(jobId: string): Promise<DraftRecord | null> {
  try {
    const record = await get<DraftRecord>(`${KEY_PREFIX}${jobId}`)
    return record ?? null
  } catch {
    return null
  }
}

/** Remove a draft after successful Azure save or explicit discard. Fails silently. */
export async function clearDraft(jobId: string): Promise<void> {
  try {
    await del(`${KEY_PREFIX}${jobId}`)
  } catch {
    // ignore
  }
}
