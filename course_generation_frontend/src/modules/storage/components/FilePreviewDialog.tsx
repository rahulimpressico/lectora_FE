import { useEffect, useState } from 'react'
import { X, FileText, Loader2, Download, ExternalLink, Calendar, Clock } from 'lucide-react'
import { formatStorageDate, formatStorageDateShort } from '@/utils/formatDate'
import mammoth from 'mammoth'
import { cn } from '@/lib/cn'
import {
  fetchExternalPreviewUrl,
  fetchStorageFileBlob,
  fetchStorageFileText,
  storageFileUrl,
  type StorageEntry,
  type StorageSource,
} from '@/api/storage/api'
import { fileExtension } from '@/utils/fileExtension'
import { ArtifactRenderer } from './ArtifactRenderer'

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])

function isImageExt(ext?: string) {
  return IMAGE_EXT.has((ext ?? '').toLowerCase())
}

function isJsonExt(ext?: string) {
  return (ext ?? '').toLowerCase() === '.json'
}

function isDocxExt(ext?: string) {
  const e = (ext ?? '').toLowerCase()
  return e === '.docx' || e === '.doc'
}

function isPdfExt(ext?: string) {
  return (ext ?? '').toLowerCase() === '.pdf'
}

function isTextExt(ext?: string) {
  const e = (ext ?? '').toLowerCase()
  return e === '.txt' || e === '.csv'
}

function resolveExtension(entry: StorageEntry): string {
  return (entry.extension ?? '').toLowerCase() || fileExtension(entry.name)
}

interface FilePreviewDialogProps {
  entry: StorageEntry | null
  source: StorageSource
  onClose: () => void
}

export function FilePreviewDialog({ entry, source, onClose }: FilePreviewDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jsonText, setJsonText] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const [plainText, setPlainText] = useState<string | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [officePreviewUrl, setOfficePreviewUrl] = useState<string | null>(null)

  const open = Boolean(entry)
  const ext = entry ? resolveExtension(entry) : ''
  const fileUrl = entry ? storageFileUrl(entry.path, source) : ''
  const showImage = isImageExt(ext)
  const showJson = isJsonExt(ext)
  const showDocx = isDocxExt(ext)
  const showPdf = isPdfExt(ext)
  const showText = isTextExt(ext)

  useEffect(() => {
    if (!open || !entry) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, entry, onClose])

  useEffect(() => {
    if (!entry) {
      setJsonText(null)
      setDocxHtml(null)
      setPlainText(null)
      setPdfPreviewUrl(null)
      setOfficePreviewUrl(null)
      setError(null)
      return
    }

    if (showImage || showPdf) {
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setJsonText(null)
    setDocxHtml(null)
    setPlainText(null)
    setPdfPreviewUrl(null)
    setOfficePreviewUrl(null)

    let objectUrl: string | null = null

    async function load() {
      try {
        if (showJson) {
          const raw = await fetchStorageFileText(entry!.path, source)
          if (cancelled) return
          try {
            const parsed = JSON.parse(raw) as unknown
            setJsonText(JSON.stringify(parsed, null, 2))
          } catch {
            setJsonText(raw)
          }
        } else if (showDocx) {
          if (source === 'uploads') {
            try {
              const preview = await fetchExternalPreviewUrl(entry!.path, source)
              if (cancelled) return
              setOfficePreviewUrl(preview.previewUrl)
              return
            } catch {
              // Fall through to PDF fallback / simplified HTML preview.
            }
          }

          // Generated-course DOCX files can also be previewed more faithfully via
          // a sibling PDF saved at the same output path. Prefer that when present.
          if (source === 'generated-courses') {
            const pdfPath = entry!.path.replace(/\.(docx|doc)$/i, '.pdf')
            try {
              const pdfBlob = await fetchStorageFileBlob(pdfPath, source)
              if (cancelled) return
              objectUrl = URL.createObjectURL(pdfBlob)
              setPdfPreviewUrl(objectUrl)
              return
            } catch {
              // Fall back to Mammoth HTML conversion when no PDF preview is stored.
            }
          }
          const blob = await fetchStorageFileBlob(entry!.path, source)
          if (cancelled) return
          const buf = await blob.arrayBuffer()
          const result = await mammoth.convertToHtml({ arrayBuffer: buf })
          setDocxHtml(result.value)
        } else if (showText) {
          const raw = await fetchStorageFileText(entry!.path, source)
          if (cancelled) return
          setPlainText(raw)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to open file')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [entry, source, showJson, showDocx, showPdf, showText, showImage])

  if (!open || !entry) return null

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[6px]"
        onClick={onClose}
      />

      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-8 pointer-events-none"
        role="dialog"
        aria-modal
        aria-label={`Preview ${entry.name}`}
      >
        <div
          className={cn(
            'pointer-events-auto flex flex-col w-full rounded-2xl bg-white shadow-2xl',
            'max-h-[calc(100vh-3rem)]',
            showImage ? 'max-w-4xl' : 'max-w-5xl',
          )}
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
              <FileText size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{entry.name}</p>
              <p className="text-xs text-slate-400 truncate">{entry.path}</p>
              {(entry.createdAt || entry.lastModified) && (
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {entry.createdAt && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                      <Calendar size={9} />
                      Created: {formatStorageDateShort(entry.createdAt)}
                    </span>
                  )}
                  {entry.lastModified && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={9} />
                      Modified: {formatStorageDate(entry.lastModified)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <a
              href={fileUrl}
              download={entry.name}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Download size={12} />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto p-5">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                <Loader2 size={28} className="animate-spin text-indigo-500" />
                <p className="text-sm">Loading preview…</p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && showImage && (
              <div className="flex items-center justify-center bg-slate-50 rounded-xl p-4 min-h-[200px]">
                <img
                  src={fileUrl}
                  alt={entry.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                />
              </div>
            )}

            {!loading && !error && showJson && jsonText !== null && (
              <ArtifactRenderer filename={entry.name} jsonText={jsonText} />
            )}

            {!loading && !error && showDocx && officePreviewUrl !== null && (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <iframe
                  src={officePreviewUrl}
                  title={entry.name}
                  className="w-full min-h-[75vh] bg-white"
                />
              </div>
            )}

            {!loading && !error && showDocx && officePreviewUrl === null && pdfPreviewUrl !== null && (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <iframe
                  src={pdfPreviewUrl}
                  title={entry.name}
                  className="w-full min-h-[75vh] bg-white"
                />
              </div>
            )}

            {!loading && !error && showDocx && officePreviewUrl === null && pdfPreviewUrl === null && docxHtml !== null && (
              <div
                className="docx-preview prose prose-sm max-w-none text-slate-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            )}

            {!loading && !error && showPdf && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <iframe
                  src={fileUrl}
                  title={entry.name}
                  className="h-[75vh] w-full bg-white"
                />
              </div>
            )}

            {!loading && !error && showText && plainText !== null && (
              <pre className="text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-auto max-h-[70vh] whitespace-pre-wrap font-mono text-slate-700">
                {plainText}
              </pre>
            )}

            {!loading && !error && !showImage && !showJson && !showDocx && !showPdf && !showText && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-slate-600 mb-4">
                  Preview is not available for this file type.
                </p>
                <a
                  href={fileUrl}
                  download={entry.name}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <ExternalLink size={14} />
                  Download file
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
