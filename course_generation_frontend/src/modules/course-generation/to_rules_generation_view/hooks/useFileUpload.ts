import { useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { uploadDocument } from '@/api/course-generation/api'
import { useCourseStore } from '../../store/courseStore'
import { useDocxPreview } from './useDocxPreview'
import type { UploadedFile, UploadedFileType } from '../../types'

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
      uploadDocument(file, topic),
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
        const isPdf = fileType === 'pdf'
        const entry: UploadedFile = {
          id,
          file,
          name:      file.name,
          sizeBytes: file.size,
          // DOCX files start in 'parsing' while mammoth runs client-side.
          // PDFs have no client-side preview step — they start directly in 'uploading'.
          status:    isPdf ? 'uploading' : 'parsing',
          fileType,
        }
        addRawDocument(entry)

        try {
          if (!isPdf) {
            // Parse DOCX client-side for inline preview, then upload.
            const previewHtml = await parseFile(file)
            updateRawDocument(id, { previewHtml, status: 'uploading' })
          }

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
