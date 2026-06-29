import { useCallback, useMemo } from 'react'
import { useMutation, useQueries } from '@tanstack/react-query'
import { uploadDocument, pollIngestionStatus } from '@/api/course-generation/api'
import { useCourseStore } from '../../../store/courseStore'
import { useDocxPreview } from './useDocxPreview'
import type { UploadedFile, UploadedFileType } from '../../../types'

const ACCEPTED_EXTENSIONS = ['.docx', '.pdf']
const INGESTION_POLL_INTERVAL_MS = 3_000

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
    rawDocuments,
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

  // Documents that still need ingestion status polling
  const pendingDocs = useMemo(
    () =>
      rawDocuments.filter(
        (f) =>
          f.documentId != null &&
          (f.ingestionStatus === 'pending' || f.ingestionStatus === 'processing'),
      ),
    [rawDocuments],
  )

  // One TanStack Query per pending document — stops automatically when status
  // becomes terminal (the document is excluded from pendingDocs and thus from
  // the queries array; with gcTime:0 the cache entry is evicted immediately).
  useQueries({
    queries: pendingDocs.map((f) => ({
      queryKey: ['ingestion-status', f.documentId],
      queryFn: async () => {
        const result = await pollIngestionStatus(f.documentId!)
        const status = result?.status ?? 'failed'
        updateRawDocument(f.id, { ingestionStatus: status })
        return status
      },
      refetchInterval: (query: { state: { data: string | undefined } }) => {
        const s = query.state.data
        return !s || s === 'pending' || s === 'processing' ? INGESTION_POLL_INTERVAL_MS : false
      },
      staleTime: 0,
      gcTime: 0,
      retry: false,
    })),
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
        const id = crypto.randomUUID()
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
            const { blobPath, uploadFolder, documentId } = await uploadToServer({
              file,
              topic: courseTopic.trim(),
            })
            setUploadFolder(uploadFolder)
            // Setting ingestionStatus:'pending' adds this doc to pendingDocs,
            // which kicks off a useQueries poll automatically.
            updateRawDocument(id, {
              blobPath,
              status: 'success',
              documentId,
              ingestionStatus: 'pending',
            })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const id = crypto.randomUUID()
        addRawDocument({
          id,
          name: entry.name,
          sizeBytes: entry.size ?? 0,
          status: 'success',
          fileType,
          blobPath: entry.path,
          source: 'azure',
          // Azure-picked files are pre-existing blobs — no ingestion status to wait for
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
