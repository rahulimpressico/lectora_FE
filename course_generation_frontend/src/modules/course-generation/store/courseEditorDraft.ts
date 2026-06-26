/**
 * courseEditorDraft.ts
 *
 * Thin IndexedDB wrapper that persists the in-progress editor state keyed by
 * jobId. Used so page refreshes restore the user's unsaved edits rather than
 * discarding them. Falls back gracefully to in-memory-only mode when IndexedDB
 * is unavailable (private-browsing quirks, storage quota exceeded, etc.).
 *
 * Key format: "lectora:course-draft:{jobId}"
 * DB:         "lectora-editor"  (objectStore: "course-drafts")
 */

import type { CourseContent } from '../types/editor'

const DB_NAME = 'lectora-editor'
const STORE_NAME = 'course-drafts'
const KEY_PREFIX = 'lectora:course-draft:'

export interface DraftRecord {
  content: CourseContent
  savedAt: string
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Persist a course draft keyed by jobId. Fails silently on error. */
export async function saveDraft(jobId: string, content: CourseContent): Promise<void> {
  try {
    const db = await openDB()
    const record: DraftRecord = { content, savedAt: new Date().toISOString() }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).put(record, `${KEY_PREFIX}${jobId}`)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => resolve()
    })
    db.close()
  } catch {
    // IndexedDB unavailable or quota exceeded — fail silently
  }
}

/** Load a draft for the given jobId. Returns null if none exists or on error. */
export async function loadDraft(jobId: string): Promise<DraftRecord | null> {
  try {
    const db = await openDB()
    return await new Promise<DraftRecord | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(`${KEY_PREFIX}${jobId}`)
      req.onsuccess = () => {
        db.close()
        resolve((req.result as DraftRecord | undefined) ?? null)
      }
      req.onerror = () => {
        db.close()
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

/** Remove a draft after successful sync or explicit discard. Fails silently. */
export async function clearDraft(jobId: string): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).delete(`${KEY_PREFIX}${jobId}`)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      tx.oncomplete = () => resolve()
    })
    db.close()
  } catch {
    // ignore
  }
}

// ─── Debounce utility ─────────────────────────────────────────────────────────

/** Returns a debounced version of `saveDraft` that waits `ms` ms after the
 *  last call before writing to IndexedDB. Call `.cancel()` to abort a pending
 *  write (e.g. on component unmount). */
export function createDebouncedSave(ms = 400): {
  schedule: (jobId: string, content: CourseContent) => void
  cancel: () => void
} {
  let timer: ReturnType<typeof setTimeout> | null = null

  function schedule(jobId: string, content: CourseContent) {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void saveDraft(jobId, content)
    }, ms)
  }

  function cancel() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return { schedule, cancel }
}
