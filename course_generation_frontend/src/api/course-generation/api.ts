
import apiClient, { LLM_REQUEST_TIMEOUT_MS } from '@/api/client'
import { ApiClientError } from '@/api/errors'
import type {
  ImportanceLevel,
  SourceAnalysis,
  SourceRole,
} from '@/modules/course-generation/types'

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Upload a single document (DOCX / PDF) to blob storage.
 * Returns the blob path, upload folder, and document ID for downstream use.
 *
 * Note: do NOT set Content-Type manually — Axios auto-sets multipart/form-data
 * with the correct boundary when a FormData body is detected.
 */
export async function uploadDocument(
  file: File,
  courseTopic: string,
): Promise<{ blobPath: string; uploadFolder: string; documentId: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('courseTopic', courseTopic.trim())
  const { data } = await apiClient.post<{ blobPath: string; uploadFolder: string; documentId: string }>(
    '/documents/upload',
    form,
    {
      // Large PDFs can take several minutes on slower networks / disks.
      timeout: 10 * 60 * 1_000,
    },
  )
  return data
}

export interface IngestionStatusResponse {
  document_id: string
  status: 'pending' | 'processing' | 'indexed' | 'parsed' | 'failed'
  total_chunks: number
  error: string | null
  updated_at: number
}

/**
 * Poll the backend ingestion status for a document uploaded via POST /documents/upload.
 * Returns null with a 404 — document_id unknown or expired.
 */
export async function pollIngestionStatus(documentId: string): Promise<IngestionStatusResponse | null> {
  try {
    const { data } = await apiClient.get<IngestionStatusResponse>(
      `/documents/${documentId}/ingestion-status`,
      { timeout: 15_000 },
    )
    return data
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return null
    throw err
  }
}


// ─── Outline structure suggestion ─────────────────────────────────────────────

export interface SuggestOutlineStructureBody {
  courseTitle?: string
  courseDescription?: string
  courseType?: string
  targetAudience?: string
  skillLevel?: string
  learningObjectives?: string[]
}

interface SuggestOutlineStructureResult {
  preferredChapters: number
  lessonStyle: string
  reasoning: string
}

/** AI-suggest chapter count and lesson style for the course outline. */
export async function suggestOutlineStructure(
  body: SuggestOutlineStructureBody,
): Promise<SuggestOutlineStructureResult> {
  const { data } = await apiClient.post<SuggestOutlineStructureResult>(
    '/documents/suggest-outline-structure',
    body,
    { timeout: 30_000 },
  )
  return data
}

// ─── TO revision ─────────────────────────────────────────────────────────────

export interface ReviseTOResponse {
  to: Record<string, unknown>
}

/**
 * Revise an existing Training Outline in-place using a user-supplied prompt.
 * Sends the current TO JSON + the user's instruction to the LLM and returns
 * the revised TO. Does NOT re-run A0 or regenerate from source documents.
 */
export async function reviseTO(
  currentTo: Record<string, unknown>,
  revisionPrompt: string,
): Promise<ReviseTOResponse> {
  const { data } = await apiClient.post<ReviseTOResponse>(
    '/documents/revise-to',
    { currentTo, revisionPrompt },
    { timeout: LLM_REQUEST_TIMEOUT_MS },
  )
  return data
}

// ─── Source analysis ───────────────────────────────────────────────────────────

export interface AnalyzeSourcePayload {
  blobPath: string
  sourceRole?: SourceRole
  extractHint?: string
  /** @deprecated inferred server-side from sourceRole when omitted */
  importance?: ImportanceLevel
}

/**
 * Extract the TOC from an uploaded document and run LLM source analysis.
 * Call this for every uploaded source document before generating a timed
 * outline. Returns a SourceAnalysis object that should be aggregated and
 * passed along as `sourceAnalyses`.
 */
export async function analyzeSource(payload: AnalyzeSourcePayload): Promise<SourceAnalysis> {
  const { data } = await apiClient.post<SourceAnalysis>(
    '/documents/analyze-source',
    payload,
    { timeout: 60_000 },
  )
  return data
}
