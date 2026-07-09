import { get, post, put } from "@/shared/api";
import type { ApiEnvelope } from "@/shared/api";
import type {
  CourseBasicCreateRequest,
  CourseBasicData,
  CourseBasicUpdateRequest,
} from "../types";

const COURSE_BASIC_ENDPOINT = "/course-basic";

export type CourseBasicResponse = ApiEnvelope<CourseBasicData>;

export async function saveCourseBasic(
  payload: CourseBasicCreateRequest,
): Promise<CourseBasicData> {
  const response = await post<CourseBasicResponse, CourseBasicCreateRequest>(
    COURSE_BASIC_ENDPOINT,
    payload,
  );
  return response.data;
}

export async function getCourseBasic(courseId: string): Promise<CourseBasicData> {
  const response = await get<CourseBasicResponse>(
    `${COURSE_BASIC_ENDPOINT}/${encodeURIComponent(courseId)}`,
  );
  return response.data;
}

export async function updateCourseBasic(
  courseId: string,
  payload: CourseBasicUpdateRequest,
): Promise<CourseBasicData> {
  const response = await put<CourseBasicResponse, CourseBasicUpdateRequest>(
    `${COURSE_BASIC_ENDPOINT}/${encodeURIComponent(courseId)}`,
    payload,
  );
  return response.data;
}
