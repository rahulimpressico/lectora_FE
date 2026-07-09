/**
 * api/course-run/types.ts
 *
 * Wire types for the backend `course_run` persistence endpoints. Snake_case
 * fields mirror the FastAPI Pydantic schemas exactly (no camelCase transform
 * layer on these endpoints).
 */

export interface CourseRunCreate {
  course_id: number
  created_from_run_id?: string | null
  created_by?: string | null
}

export interface CourseRunData {
  id: string
  course_id: number
  version_number: number
  created_from_run_id: string | null
  status_code: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CourseRunSpecCreate {
  course_run_id: string
  course_scope?: string | null
  duration_hours?: number | null
  difficulty_level?: string | null
  target_audience?: string | null
  learner_experience_level?: string | null
  learner_outcomes?: string | null
  required_topics_json?: string | null
  learning_objectives_json?: string | null
  tone?: string | null
  depth?: string | null
  emphasis?: string | null
  avoid_instructions?: string | null
  include_case_studies?: boolean | null
  include_examples?: boolean | null
  course_structure_mode?: string | null
  uploaded_outline_blob_path?: string | null
  rule_pack_id?: string | null
  rule_pack_version?: string | null
  effective_rule_pack_blob_path?: string | null
  outline_notes?: string | null
}

export interface CourseRunInputCreate {
  course_run_id: string
  input_type: string
  original_filename: string
  blob_path: string
  file_size?: number | null
  mime_type?: string | null
  source_intent?: string | null
  uploaded_by?: string | null
}

export interface CourseRunRuleOverrideCreate {
  course_run_id: string
  rule_name: string
  original_value_json?: string | null
  override_value_json?: string | null
  created_by?: string | null
}

/** Envelope shared by every course_run endpoint response. */
export interface CourseRunApiResponse<T> {
  success: boolean
  data: T
}
