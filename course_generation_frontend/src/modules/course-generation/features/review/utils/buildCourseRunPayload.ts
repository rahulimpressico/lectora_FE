/**
 * Maps the persisted onboarding/course-generation store (course-workflow-v5
 * in localStorage) onto the `course_run` API's request DTOs so the
 * "Generate Course" action can persist structured metadata via the existing
 * backend endpoints.
 */
import type { CourseRunInputCreate, CourseRunRuleOverrideCreate, CourseRunSpecCreate } from '@/api/course-run/types'
import type { CourseRunSubmission } from '@/api/course-run/api'
import type { CourseState } from '../../onboarding-flow/store/types'
import { deepGet } from '../../../utils/deepUpdate'

type SpecSourceState = Pick<
  CourseState,
  'wizardData' | 'durationHours' | 'difficultyLevel' | 'audience' | 'toDocument' | 'generatedToBlobPath'
>

type InputsSourceState = Pick<CourseState, 'rawDocuments' | 'toDocument'>

type RuleOverridesSourceState = Pick<CourseState, 'rulesData' | 'updatedRulesData' | 'modifiedRulesPaths'>

export function buildCourseRunSpec(state: SpecSourceState): Omit<CourseRunSpecCreate, 'course_run_id'> {
  const { wizardData, durationHours, difficultyLevel, audience, toDocument, generatedToBlobPath } = state

  const uploadedOutlineBlobPath =
    toDocument?.status === 'success' && toDocument.blobPath ? toDocument.blobPath : generatedToBlobPath ?? null

  return {
    course_scope: wizardData.description.trim() || null,
    duration_hours: durationHours,
    difficulty_level: difficultyLevel,
    target_audience: audience.trim() || null,
    learner_experience_level: wizardData.experienceLevel || null,
    learner_outcomes: wizardData.learnerOutcomes.trim() || null,
    required_topics_json: JSON.stringify(wizardData.requiredTopics),
    learning_objectives_json: JSON.stringify(wizardData.objectives),
    tone: wizardData.tone.trim() || null,
    depth: wizardData.depth || null,
    emphasis: wizardData.emphasis.trim() || null,
    avoid_instructions: wizardData.avoid.trim() || null,
    include_case_studies: wizardData.includeCaseStudies,
    include_examples: wizardData.includeExamples,
    course_structure_mode: wizardData.outlineMode,
    uploaded_outline_blob_path: uploadedOutlineBlobPath,
    outline_notes: wizardData.sourceNotes.trim() || null,
  }
}

export function buildCourseRunInputs(state: InputsSourceState): Omit<CourseRunInputCreate, 'course_run_id'>[] {
  const inputs: Omit<CourseRunInputCreate, 'course_run_id'>[] = []

  for (const file of state.rawDocuments) {
    if (file.status !== 'success' || !file.blobPath) continue
    inputs.push({
      input_type: 'study_guide',
      original_filename: file.name,
      blob_path: file.blobPath,
      file_size: file.sizeBytes ?? null,
      source_intent: file.extractHint?.trim() || null,
      uploaded_by: 'system',
    })
  }

  const { toDocument } = state
  if (toDocument?.status === 'success' && toDocument.blobPath) {
    inputs.push({
      input_type: 'timed_outline',
      original_filename: toDocument.name,
      blob_path: toDocument.blobPath,
      file_size: toDocument.sizeBytes ?? null,
      source_intent: toDocument.extractHint?.trim() || null,
      uploaded_by: 'system',
    })
  }

  return inputs
}

/** Diffs `modifiedRulesPaths` against `rulesData`/`updatedRulesData` into per-field overrides. */
export function buildCourseRunRuleOverrides(
  state: RuleOverridesSourceState,
): Omit<CourseRunRuleOverrideCreate, 'course_run_id'>[] {
  const { rulesData, updatedRulesData, modifiedRulesPaths } = state
  if (!rulesData || !updatedRulesData || modifiedRulesPaths.size === 0) return []

  return Array.from(modifiedRulesPaths).map((ruleName) => {
    const path = ruleName.split('.')
    const originalValue = deepGet(rulesData, path) ?? null
    const overrideValue = deepGet(updatedRulesData, path) ?? null
    return {
      rule_name: ruleName,
      original_value_json: JSON.stringify(originalValue),
      override_value_json: JSON.stringify(overrideValue),
    }
  })
}

export function buildCourseRunSubmission(
  state: SpecSourceState & InputsSourceState & RuleOverridesSourceState & Pick<CourseState, 'courseId'>,
): CourseRunSubmission {
  if (!state.courseId) {
    throw new Error('This course has not been saved yet — missing course id.')
  }
  const courseId = Number(state.courseId)
  if (!Number.isFinite(courseId)) {
    throw new Error('Invalid course id — expected a numeric id.')
  }

  return {
    courseId,
    spec: buildCourseRunSpec(state),
    inputs: buildCourseRunInputs(state),
    ruleOverrides: buildCourseRunRuleOverrides(state),
  }
}
