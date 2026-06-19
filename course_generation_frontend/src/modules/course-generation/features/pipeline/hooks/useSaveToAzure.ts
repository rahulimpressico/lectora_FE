import { useMutation } from '@tanstack/react-query'
import { saveToAzure } from '@/api/editor/api'
import { ApiClientError } from '@/api/errors'
import type { SaveToAzureResponse } from '../../../types/editor'

export interface SaveToAzureParams {
  jobId: string
  courseTitle?: string
  courseSlug?: string
  sectionOrder?: string[]
}

export interface SaveToAzureState {
  status: 'idle' | 'loading' | 'success' | 'error'
  result: SaveToAzureResponse | null
  errorMessage: string | null
}

export function useSaveToAzure() {
  const mutation = useMutation({
    mutationFn: ({ jobId, courseTitle, courseSlug, sectionOrder }: SaveToAzureParams) =>
      saveToAzure(jobId, { courseTitle, courseSlug, sectionOrder }),
  })

  const state: SaveToAzureState = mutation.isPending
    ? { status: 'loading', result: null, errorMessage: null }
    : mutation.isSuccess
    ? { status: 'success', result: mutation.data, errorMessage: null }
    : mutation.isError
    ? {
        status: 'error',
        result: null,
        errorMessage: extractErrorMessage(mutation.error),
      }
    : { status: 'idle', result: null, errorMessage: null }

  return {
    save: (params: SaveToAzureParams) => mutation.mutate(params),
    reset: () => mutation.reset(),
    ...state,
  }
}

function extractErrorMessage(error: unknown): string {
  const message =
    error instanceof ApiClientError
      ? error.message
      : error instanceof Error
        ? error.message
        : ''

  if (/timeout/i.test(message)) {
    return (
      'The upload took longer than expected. Large courses can take several minutes — ' +
      'check Generated Courses in the Asset Library before trying again.'
    )
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosErr = error as { response?: { data?: { detail?: { message?: string } | string } } }
    const detail = axiosErr.response?.data?.detail
    if (detail && typeof detail === 'object' && detail.message) return detail.message
    if (typeof detail === 'string') return detail
  }

  if (message) return message
  return 'Failed to upload to Azure. Please try again.'
}
