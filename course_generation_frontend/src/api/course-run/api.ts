/**
 * api/course-run/api.ts
 *
 * Persists course generation metadata via the backend `course_run` endpoints
 * (course_runs, course_run_specs, course_run_inputs, course_run_rule_overrides).
 * These calls only persist structured metadata — they do not trigger content
 * generation (that remains a separate `/jobs` flow).
 */
import apiClient from '@/api/client'
import type {
  CourseRunApiResponse,
  CourseRunCreate,
  CourseRunData,
  CourseRunInputCreate,
  CourseRunRuleOverrideCreate,
  CourseRunSpecCreate,
} from './types'

export async function createCourseRun(payload: CourseRunCreate): Promise<CourseRunData> {
  const { data } = await apiClient.post<CourseRunApiResponse<CourseRunData>>('/course-runs', payload)
  return data.data
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
}

export interface CourseRunSubmissionResult {
  courseRunId: string
}

/**
 * Creates a course_run, then its spec/inputs/rule-overrides in parallel
 * against the returned run id.
 */
export async function submitCourseRun(
  submission: CourseRunSubmission,
): Promise<CourseRunSubmissionResult> {
  const run = await createCourseRun({ course_id: submission.courseId })
  const courseRunId = run.id

  await Promise.all([
    createCourseRunSpec({ ...submission.spec, course_run_id: courseRunId }),
    ...submission.inputs.map((input) =>
      createCourseRunInput({ ...input, course_run_id: courseRunId }),
    ),
    ...submission.ruleOverrides.map((override) =>
      createCourseRunRuleOverride({ ...override, course_run_id: courseRunId }),
    ),
  ])

  return { courseRunId }
}
