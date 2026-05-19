import { useEffect, useRef } from 'react'
import { X, FileText, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Spinner } from '@/shared/components/Spinner'
import type { UploadedFile } from '../types'

interface FilePreviewDrawerProps {
  file: UploadedFile | null
  open: boolean
  onClose: () => void
}

export function FilePreviewDrawer({ file, open, onClose }: FilePreviewDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      <div
        ref={drawerRef}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[600px] max-w-[95vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Document preview"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
            <FileText size={15} className="text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {file?.name ?? 'Document Preview'}
            </p>
            <p className="text-xs text-slate-400">Read-only preview</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {!file ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : !file.previewHtml ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <ExternalLink size={32} />
              <p className="text-sm">No preview available</p>
            </div>
          ) : (
            <div
              className="docx-preview prose prose-sm prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: file.previewHtml }}
            />
          )}
        </div>
      </div>

      <style>{`
        .docx-preview h1 { font-size: 1.375rem; font-weight: 700; color: #0f172a; margin: 1.5rem 0 0.75rem; line-height: 1.3; }
        .docx-preview h2 { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 1.25rem 0 0.5rem; }
        .docx-preview h3 { font-size: 0.9375rem; font-weight: 600; color: #334155; margin: 1rem 0 0.375rem; }
        .docx-preview p  { font-size: 0.875rem; color: #475569; line-height: 1.7; margin: 0.5rem 0; }
        .docx-preview ul, .docx-preview ol { padding-left: 1.5rem; margin: 0.5rem 0; }
        .docx-preview li { font-size: 0.875rem; color: #475569; line-height: 1.7; margin: 0.2rem 0; }
        .docx-preview strong { font-weight: 600; color: #334155; }
        .docx-preview table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.8125rem; }
        .docx-preview th { background: #f8fafc; font-weight: 600; text-align: left; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; color: #374151; }
        .docx-preview td { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; color: #475569; }
        .docx-preview tr:nth-child(even) td { background: #f8fafc; }
      `}</style>
    </>
  )
}
