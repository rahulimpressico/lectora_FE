/** Mirrors `CourseStatus` in Lectora_BE/api/course_basic/schemas.py. */
export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/**
 * `course_scope`, `course_duration`, and `difficulty_level` are onboarding-wizard
 * state kept in the Zustand `useCourseStore` — they are not sent to this API.
 * `course_type` is persisted via `courseTypeHint` on create/update.
 */

/** Mirrors `CourseBasicCreate` in Lectora_BE/api/course_basic/schemas.py. */
export interface CourseBasicCreateRequest {
  course_title: string;
  course_type: string;
  /** Optional — backend defaults to the logged-in user when omitted. */
  created_by?: string;
}

/** Mirrors `CourseBasicUpdate` in Lectora_BE/api/course_basic/schemas.py. */
export interface CourseBasicUpdateRequest {
  course_title: string;
  course_type: string;
  status_code: CourseStatus;
  created_by: string;
}

/** Mirrors `CourseBasicData` in Lectora_BE/api/course_basic/schemas.py. */
export interface CourseBasicData {
  id: number;
  course_code: string;
  course_title: string;
  course_type: string;
  status_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
