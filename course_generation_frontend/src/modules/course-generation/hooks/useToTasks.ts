import { useQuery } from '@tanstack/react-query'
import { listGenerateTOJobs, type TOTaskSummary } from '@/api/course-generation/api'

/** Canonical query key shared across all components that show TO task status. */
export const TO_TASKS_QUERY_KEY = ['to-tasks'] as const

/** Canonical polling interval for TO-generation task status. */
const TO_TASKS_POLL_INTERVAL_MS = 4_000

function hasProcessingTasks(tasks: TOTaskSummary[] | undefined): boolean {
  return (tasks ?? []).some((t) => t.status === 'processing')
}

/**
 * Shared hook that fetches and polls all recent TO-generation tasks.
 *
 * Polls every 4 s only while at least one task is `processing`; stops when
 * every task is completed, failed, or cancelled.
 *
 * Using a single hook definition ensures there is exactly one inflight request
 * and one canonical poll interval — even when both UploadPhase and TOTasksPanel
 * are mounted simultaneously.
 */
export function useToTasks() {
  const { data, isFetching, refetch } = useQuery<TOTaskSummary[]>({
    queryKey: TO_TASKS_QUERY_KEY,
    queryFn: listGenerateTOJobs,
    refetchInterval: (query) =>
      hasProcessingTasks(query.state.data) ? TO_TASKS_POLL_INTERVAL_MS : false,
    staleTime: 0,
  })

  const tasks = data ?? []
  const runningCount = tasks.filter(t => t.status === 'processing').length

  return { tasks, runningCount, isFetching, refetch }
}
