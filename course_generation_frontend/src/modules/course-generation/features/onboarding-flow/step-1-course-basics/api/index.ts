import apiClient from '@/api/client'
import type { ApiEnvelope } from '@/shared/api/types'
import type {
  CourseBasicCreateRequest,
  CourseBasicData,
  CourseBasicUpdateRequest,
} from '../types'

const COURSE_BASIC_ENDPOINT = '/course-basic'

export type CourseBasicResponse = ApiEnvelope<CourseBasicData>

export async function saveCourseBasic(
  payload: CourseBasicCreateRequest,
): Promise<CourseBasicData> {
  const { data } = await apiClient.post<CourseBasicResponse>(
    COURSE_BASIC_ENDPOINT,
    payload,
  )
  return data.data
}

export async function getCourseBasic(courseId: string): Promise<CourseBasicData> {
  const { data } = await apiClient.get<CourseBasicResponse>(
    `${COURSE_BASIC_ENDPOINT}/${encodeURIComponent(courseId)}`,
  )
  return data.data
}

export async function updateCourseBasic(
  courseId: string,
  payload: CourseBasicUpdateRequest,
): Promise<CourseBasicData> {
  const { data } = await apiClient.put<CourseBasicResponse>(
    `${COURSE_BASIC_ENDPOINT}/${encodeURIComponent(courseId)}`,
    payload,
  )
  return data.data
}
