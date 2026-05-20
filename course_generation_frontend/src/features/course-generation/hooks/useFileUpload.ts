import { useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { courseApi } from '../api/courseApi'
import { useCourseStore } from '../store/courseStore'
import { useDocxPreview } from './useDocxPreview'
import type { UploadedFile } from '../types'

function isValidCourseTopic(topic: string): boolean {
  const t = topic.trim()
  return t.length >= 2 && /[A-Za-z0-9]/.test(t)
}

export function useFileUpload(_slot: 'raw' | 'outline' = 'raw') {
  const { addRawDocument, updateRawDocument, courseTopic, setUploadFolder } =
    useCourseStore()
  const { parseFile } = useDocxPreview()

  const { mutateAsync: uploadToServer } = useMutation({
    mutationFn: ({ file, topic }: { file: File; topic: string }) =>
      courseApi.uploadDocument(file, topic),
  })

  const enqueueFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!isValidCourseTopic(courseTopic)) {
        return
      }

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
            const { blobPath, uploadFolder } = await uploadToServer({
              file,
              topic: courseTopic.trim(),
            })
            setUploadFolder(uploadFolder)
            updateRawDocument(id, { blobPath, status: 'success' })
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : 'Upload failed — server unreachable'
            updateRawDocument(id, { status: 'error', errorMessage: msg })
          }
        } catch {
          updateRawDocument(id, { status: 'error', errorMessage: 'Failed to parse file' })
        }
      }
    },
    [addRawDocument, updateRawDocument, parseFile, uploadToServer, courseTopic, setUploadFolder],
  )

  return { enqueueFiles, isTopicValid: isValidCourseTopic(courseTopic) }
}
