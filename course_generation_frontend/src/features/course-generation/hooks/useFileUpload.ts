import { useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { courseApi } from '../api/courseApi'
import { useCourseStore } from '../store/courseStore'
import { useDocxPreview } from './useDocxPreview'
import type { UploadedFile } from '../types'

export function useFileUpload(_slot: 'raw' | 'outline' = 'raw') {
  const { addRawDocument, updateRawDocument } = useCourseStore()
  const { parseFile } = useDocxPreview()

  const { mutateAsync: uploadToServer } = useMutation({
    mutationFn: courseApi.uploadDocument,
  })

  const enqueueFiles = useCallback(
    async (files: FileList | File[]) => {
      const accepted = Array.from(files).filter((f) =>
        f.name.toLowerCase().endsWith('.docx'),
      )

      for (const file of accepted) {
        const id = uuid()
        const entry: UploadedFile = {
          id,
          file,
          name:      file.name,
          sizeBytes: file.size,
          status:    'parsing',
        }
        addRawDocument(entry)

        try {
          const previewHtml = await parseFile(file)
          updateRawDocument(id, { previewHtml, status: 'uploading' })
          try {
            const { blobPath } = await uploadToServer(file)
            updateRawDocument(id, { blobPath, status: 'success' })
          } catch {
            updateRawDocument(id, { status: 'error', errorMessage: 'Upload failed — server unreachable' })
          }
        } catch {
          updateRawDocument(id, { status: 'error', errorMessage: 'Failed to parse file' })
        }
      }
    },
    [addRawDocument, updateRawDocument, parseFile, uploadToServer],
  )

  return { enqueueFiles }
}
