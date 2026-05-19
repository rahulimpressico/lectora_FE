import { useState, useCallback } from 'react'
import mammoth from 'mammoth'

interface UseDocxPreviewResult {
  html: string | null
  loading: boolean
  error: string | null
  parseFile: (file: File) => Promise<string>
}

export function useDocxPreview(): UseDocxPreviewResult {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseFile = useCallback(async (file: File): Promise<string> => {
    setLoading(true)
    setError(null)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.convertToHtml({ arrayBuffer })
      setHtml(result.value)
      return result.value
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse document'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { html, loading, error, parseFile }
}
