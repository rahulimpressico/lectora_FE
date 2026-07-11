/**
 * api/course-run/api.ts
 *
 * Persists course generation metadata via the backend `course_run` endpoints
 * (course_runs, course_run_specs, course_run_inputs, course_run_rule_overrides),
 * then kicks off content generation via `POST /course-runs/{id}/jobs`.
 */
import apiClient from '@/api/client'
import type {
  CourseRunApiResponse,
  CourseRunCreate,
  CourseRunData,
  CourseRunDetailData,
  CourseRunInputCreate,
  CourseRunRuleOverrideCreate,
  CourseRunSpecCreate,
} from './types'

interface CourseGenerationJobData {
  id: number
  course_run_id: number
  status_code: string
  requested_by: string
  shared_state_blob_path: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
}

export interface GenerateCourseRequest {
  requested_by?: string | null
  training_outline?: Record<string, unknown> | null
}

/** Queues content generation for an already-persisted course run; returns the new job id. */
export async function createCourseGenerationJob(
  courseRunId: string,
  payload: GenerateCourseRequest = {},
): Promise<CourseGenerationJobData> {
  const { data } = await apiClient.post<CourseRunApiResponse<CourseGenerationJobData>>(
    `/course-runs/${courseRunId}/jobs`,
    payload,
  )
  return data.data
}

export async function createCourseRun(payload: CourseRunCreate): Promise<CourseRunData> {
  // POST /course-runs responds with a detail envelope: { data: { run, spec, inputs, rule_overrides } }.
  const { data } = await apiClient.post<CourseRunApiResponse<CourseRunDetailData>>('/course-runs', payload)
  return data.data.run
}

export async function createCourseRunSpec(payload: CourseRunSpecCreate): Promise<void> {
  await apiClient.post('/course-run-specs', payload)
}

export async function createCourseRunInput(payload: CourseRunInputCreate): Promise<void> {
  await apiClient.post('/course-run-inputs', payload)
}

export async function createCourseRunRuleOverride(payload: CourseRunRuleOverrideCreate): Promise<void> {
  await apiClient.post('/course-run-rule-overrides', payload)
}

export interface CourseRunSubmission {
  courseId: number
  spec: Omit<CourseRunSpecCreate, 'course_run_id'>
  inputs: Omit<CourseRunInputCreate, 'course_run_id'>[]
  ruleOverrides: Omit<CourseRunRuleOverrideCreate, 'course_run_id'>[]
  /** Already-generated Timed Outline JSON, if any — skips TO generation server-side. */
  trainingOutline?: Record<string, unknown> | null
  requestedBy?: string | null
}

export interface CourseRunSubmissionResult {
  courseRunId: string
  jobId: string
}

/**
 * Creates a course_run, then its spec/inputs/rule-overrides in parallel
 * against the returned run id, then queues content generation for that run.
 */
export async function submitCourseRun(
  submission: CourseRunSubmission,
): Promise<CourseRunSubmissionResult> {
  const run = await createCourseRun({ course_id: submission.courseId })
  // The backend's spec/input/override schemas take course_run_id as a string.
  const courseRunId = String(run.id)

  await Promise.all([
    createCourseRunSpec({ ...submission.spec, course_run_id: courseRunId }),
    ...submission.inputs.map((input) =>
      createCourseRunInput({ ...input, course_run_id: courseRunId }),
    ),
    ...submission.ruleOverrides.map((override) =>
      createCourseRunRuleOverride({ ...override, course_run_id: courseRunId }),
    ),
  ])

  const job = await createCourseGenerationJob(courseRunId, {
    requested_by: submission.requestedBy,
    training_outline: submission.trainingOutline,
  })

  return { courseRunId, jobId: String(job.id) }
}
