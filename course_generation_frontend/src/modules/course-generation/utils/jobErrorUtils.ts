import type { AxiosError } from 'axios'

export const extractErrorMessage = (err: unknown): string => {
  const axiosErr = err as AxiosError<{
    detail?: string | { message?: string; error?: string; blobPath?: string }
  }>
  const detail = axiosErr?.response?.data?.detail
  if (detail) {
    if (typeof detail === 'string') return detail
    if (typeof detail === 'object') {
      return detail.message ?? detail.error ?? JSON.stringify(detail)
    }
  }
  if (err instanceof Error) return err.message
  return 'Unknown error — please try again.'
}

export const isFileNotFoundError = (err: unknown): boolean => {
  const axiosErr = err as AxiosError<{ detail?: unknown }>
  const status = axiosErr?.response?.status
  if (status !== 404 && status !== 422) return false
  const detail = axiosErr?.response?.data?.detail
  const text =
    typeof detail === 'string'
      ? detail
      : typeof detail === 'object' && detail !== null
        ? JSON.stringify(detail)
        : ''
  return (
    text.toLowerCase().includes('not found') ||
    text.toLowerCase().includes('file_not_found') ||
    text.toLowerCase().includes('blobpath') ||
    text.toLowerCase().includes('re-upload')
  )
}
