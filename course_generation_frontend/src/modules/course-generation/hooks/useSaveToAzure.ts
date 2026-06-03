import { useMutation } from '@tanstack/react-query'
import { saveToAzure } from '@/api/editor/api'
import type { SaveToAzureResponse } from '../types/editor'

export interface SaveToAzureState {
  status: 'idle' | 'loading' | 'success' | 'error'
  result: SaveToAzureResponse | null
  errorMessage: string | null
}

export function useSaveToAzure() {
  const mutation = useMutation({
    mutationFn: (jobId: string) => saveToAzure(jobId),
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
    save: (jobId: string) => mutation.mutate(jobId),
    reset: () => mutation.reset(),
    ...state,
  }
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosErr = error as { response?: { data?: { detail?: { message?: string } | string } } }
    const detail = axiosErr.response?.data?.detail
    if (detail && typeof detail === 'object' && detail.message) return detail.message
    if (typeof detail === 'string') return detail
  }
  if (error instanceof Error) return error.message
  return 'Failed to upload to Azure. Please try again.'
}
