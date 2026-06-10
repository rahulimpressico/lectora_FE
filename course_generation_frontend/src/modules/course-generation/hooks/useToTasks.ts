import { useQuery } from '@tanstack/react-query'
import { listGenerateTOJobs, type TOTaskSummary } from '@/api/course-generation/api'

/** Canonical query key shared across all components that show TO task status. */
export const TO_TASKS_QUERY_KEY = ['to-tasks'] as const

/** Canonical polling interval for TO-generation task status. */
const TO_TASKS_POLL_INTERVAL_MS = 4_000

/**
 * Shared hook that fetches and polls all recent TO-generation tasks.
 *
 * Using a single hook definition ensures there is exactly one inflight request
 * and one canonical poll interval — even when both UploadPhase and TOTasksPanel
 * are mounted simultaneously.
 */
export function useToTasks() {
  const { data, isFetching, refetch } = useQuery<TOTaskSummary[]>({
    queryKey: TO_TASKS_QUERY_KEY,
    queryFn: listGenerateTOJobs,
    refetchInterval: TO_TASKS_POLL_INTERVAL_MS,
    staleTime: 0,
  })

  const tasks = data ?? []
  const runningCount = tasks.filter(t => t.status === 'processing').length

  return { tasks, runningCount, isFetching, refetch }
}
