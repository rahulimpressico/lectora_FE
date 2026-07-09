/**
 * api/jobs/api.ts
 *
 * Job lifecycle: creation, status polling, retry, and artifact listing.
 */
import apiClient from '@/api/client'
import type { GenerateCoursePayload, JobDetail } from '@/modules/course-generation/types'

// ─── API calls ────────────────────────────────────────────────────────────────

export async function createJob(
  payload: GenerateCoursePayload,
): Promise<{ jobId: string }> {
  const { data } = await apiClient.post<{ jobId: string }>('/jobs', payload)
  return data
}

/** Full job detail including per-stage progress — matches backend JobDetailResponse. */
export async function getJobDetail(jobId: string): Promise<JobDetail> {
  const { data } = await apiClient.get<JobDetail>(`/jobs/${jobId}`)
  return data
}

export async function retryJob(
  jobId: string,
  fromStage: string,
): Promise<{ jobId: string; status: string }> {
  const { data } = await apiClient.post(`/jobs/${jobId}/retry`, { fromStage })
  return data
}

export async function getArtifacts(
  jobId: string,
): Promise<{ artifactUrl: string; filename: string }[]> {
  const { data } = await apiClient.get(`/jobs/${jobId}/artifacts`)
  return data
}

export async function cancelJob(
  jobId: string,
): Promise<{ jobId: string; status: string }> {
  const { data } = await apiClient.delete(`/jobs/${jobId}`)
  return data
}
export async function getJobByCourseSlug(
  slug: string,
): Promise<{ jobId: string; status: string; courseTitle: string } | null> {
  try {
    const { data } = await apiClient.get<{ jobId: string; status: string; courseTitle: string }>(
      `/jobs/by-course-slug/${encodeURIComponent(slug)}`,
    )
    return data
  } catch {
    return null
  }
}
