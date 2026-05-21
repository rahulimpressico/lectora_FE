import { useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { courseApi } from '../api/courseApi'
import { useCourseStore } from '../store/courseStore'
import { useDocxPreview } from './useDocxPreview'
import type { UploadedFile, UploadedFileType } from '../types'

const ACCEPTED_EXTENSIONS = ['.docx', '.pdf']

function isValidCourseTopic(topic: string): boolean {
  const t = topic.trim()
  return t.length >= 2 && /[A-Za-z0-9]/.test(t)
}

function getFileType(filename: string): UploadedFileType | null {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.pdf')) return 'pdf'
  return null
}

export function useFileUpload(_slot: 'raw' | 'outline' = 'raw') {
  const {
    addRawDocument,
    updateRawDocument,
    courseTopic,
    setCourseTopic,
    setUploadFolder,
  } = useCourseStore()
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

      const accepted = Array.from(files).filter((f) => {
        const t = getFileType(f.name)
        return t !== null
      })

      for (const file of accepted) {
        const fileType = getFileType(file.name)!
        const id = uuid()
        const entry: UploadedFile = {
          id,
          file,
          name:      file.name,
          sizeBytes: file.size,
          status:    fileType === 'docx' ? 'parsing' : 'uploading',
          fileType,
        }
        addRawDocument(entry)

        try {
          if (fileType === 'docx') {
            // Parse DOCX client-side for inline preview, then upload.
            const previewHtml = await parseFile(file)
            updateRawDocument(id, { previewHtml, status: 'uploading' })
          }
          // PDFs skip client-side parsing and go straight to upload.
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

  const enqueueAzureFiles = useCallback(
    (entries: Array<{ name: string; path: string; size?: number }>) => {
      const first = entries[0]
      if (first?.path) {
        const folder = first.path.split('/').filter(Boolean)[0]
        if (folder && !courseTopic.trim()) {
          const title = folder.replace(/_/g, ' ').trim()
          setCourseTopic(title)
          setUploadFolder(folder)
        }
      }
      for (const entry of entries) {
        const fileType = getFileType(entry.name) ?? 'docx'
        const id = uuid()
        addRawDocument({
          id,
          name: entry.name,
          sizeBytes: entry.size ?? 0,
          status: 'success',
          fileType,
          blobPath: entry.path,
          source: 'azure',
        })
      }
    },
    [addRawDocument, courseTopic, setCourseTopic, setUploadFolder],
  )

  return {
    enqueueFiles,
    enqueueAzureFiles,
    isTopicValid: isValidCourseTopic(courseTopic),
    acceptedExtensions: ACCEPTED_EXTENSIONS,
  }
}
