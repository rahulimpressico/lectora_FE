import { useQuery } from "@tanstack/react-query";
import { getCourseBasic } from "../api";

/** Canonical query key shared wherever course-basic details are read. */
export const COURSE_BASIC_QUERY_KEY = ["course-basic"] as const;

export function courseBasicQueryKey(courseId: string) {
  return [...COURSE_BASIC_QUERY_KEY, courseId] as const;
}

/**
 * Fetches persisted course-basic details for a stored `courseId`.
 *
 * React Query deduplicates concurrent requests, so React Strict Mode's
 * mount/unmount/remount cycle only triggers one network call.
 */
export function useCourseBasic(courseId: string | null) {
  return useQuery({
    queryKey: courseBasicQueryKey(courseId ?? ""),
    queryFn: () => getCourseBasic(courseId!),
    enabled: !!courseId,
  });
}
