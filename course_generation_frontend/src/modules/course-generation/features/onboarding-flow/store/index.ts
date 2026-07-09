/**
 * Single centralized store for the onboarding flow (and, since it's the only
 * workflow-state store in this module, for every phase that follows it too —
 * upload, three-panel review, pipeline, and the course editor all read from
 * the same `useCourseStore`).
 */
export { useCourseStore, clearCourseStorage } from './onboarding.store'
export type { CourseState } from './types/index'
