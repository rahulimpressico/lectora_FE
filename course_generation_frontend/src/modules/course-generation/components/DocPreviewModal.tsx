import { useEffect } from 'react'
import { X, FileText, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useCourseStore } from '../store/courseStore'
import { formatBytes } from '@/utils/formatBytes'

export function DocPreviewModal() {
  const { rawDocuments, previewOpen, previewFileId, closePreview } = useCourseStore()
  const file = rawDocuments.find((f) => f.id === previewFileId) ?? null

  /* ── Keyboard + scroll lock ──────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closePreview])

  useEffect(() => {
    document.body.style.overflow = previewOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [previewOpen])

  /* ── Don't render when fully closed and no file ─────────────────────────── */
  if (!previewOpen && !file) return null

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={closePreview}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-[4px] transition-opacity duration-300',
          previewOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* ── Modal shell ──────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 pointer-events-none',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Document preview"
      >
        <div
          className={cn(
            'pointer-events-auto flex flex-col w-full max-w-4xl rounded-2xl bg-white transition-all duration-300 ease-out',
            'shadow-[0_32px_80px_-10px_rgba(0,0,0,0.3),0_12px_24px_-5px_rgba(0,0,0,0.12)]',
            /* vertical constraint: leave room at top + bottom */
            'max-h-[calc(100vh-4rem)]',
            previewOpen
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-3 pointer-events-none',
          )}
        >
          {/* ── Modal header ───────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4 shrink-0 rounded-t-2xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 ring-1 ring-indigo-100">
              <FileText size={18} className="text-indigo-600" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {file?.name ?? 'Document Preview'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {file
                  ? `${formatBytes(file.sizeBytes)} · Study Guide · Read-only preview`
                  : 'Read-only preview'}
              </p>
            </div>

            {/* Open in new tab */}
            {file?.previewHtml && (
              <button
                type="button"
                title="Open in new tab"
                onClick={() => {
                  const w = window.open('', '_blank')
                  if (w) {
                    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${file.name}</title><style>body{font-family:system-ui,sans-serif;max-width:860px;margin:0 auto;padding:2rem;color:#1e293b;line-height:1.7;}h1{font-size:1.5rem;font-weight:700;margin:1.5rem 0 .75rem}h2{font-size:1.2rem;font-weight:600;margin:1.25rem 0 .5rem}p{color:#475569;margin:.5rem 0}ul,ol{padding-left:1.5rem;margin:.5rem 0}li{color:#475569;margin:.2rem 0}table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:.875rem}th{background:#f8fafc;padding:.5rem .75rem;border:1px solid #e2e8f0;text-align:left}td{padding:.5rem .75rem;border:1px solid #e2e8f0}</style></head><body>${file.previewHtml}</body></html>`)
                    w.document.close()
                  }
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <Maximize2 size={14} />
              </button>
            )}

            {/* Close */}
            <button
              type="button"
              onClick={closePreview}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm"
            >
              <X size={13} />
              Close
            </button>
          </div>

          {/* ── Scrollable document content ────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-10 py-8 min-h-0">
            {!file?.previewHtml ? (
              <div className="flex h-48 items-center justify-center text-slate-400">
                <p className="text-sm">No preview available for this file.</p>
              </div>
            ) : (
              <div
                className="docx-modal-preview"
                dangerouslySetInnerHTML={{ __html: file.previewHtml }}
              />
            )}
          </div>

          {/* ── Footer hint ────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-6 py-3 shrink-0 rounded-b-2xl bg-slate-50/40">
            <p className="text-[11px] text-slate-400">
              Press <kbd className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">Esc</kbd> to close
            </p>
            <p className="text-[11px] text-slate-400">Read-only · editing happens in the TO panel</p>
          </div>
        </div>
      </div>

      {/* ── Premium document typography ─────────────────────────────────────── */}
      <style>{`
        .docx-modal-preview {
          font-size: 0.9375rem;
          color: #374151;
          line-height: 1.75;
        }
        .docx-modal-preview h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          margin: 2rem 0 0.875rem;
          line-height: 1.25;
          letter-spacing: -0.02em;
          padding-bottom: 0.625rem;
          border-bottom: 2px solid #e2e8f0;
        }
        .docx-modal-preview h1:first-child { margin-top: 0; }
        .docx-modal-preview h2 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin: 1.75rem 0 0.5rem;
          line-height: 1.35;
          letter-spacing: -0.01em;
        }
        .docx-modal-preview h3 {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #334155;
          margin: 1.25rem 0 0.375rem;
        }
        .docx-modal-preview p {
          font-size: 0.9375rem;
          color: #4b5563;
          line-height: 1.75;
          margin: 0.625rem 0;
        }
        .docx-modal-preview ul,
        .docx-modal-preview ol {
          padding-left: 1.5rem;
          margin: 0.625rem 0;
        }
        .docx-modal-preview li {
          font-size: 0.9375rem;
          color: #4b5563;
          line-height: 1.7;
          margin: 0.25rem 0;
        }
        .docx-modal-preview strong {
          font-weight: 600;
          color: #1e293b;
        }
        .docx-modal-preview table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.25rem 0;
          font-size: 0.875rem;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0,0,0,0.06);
        }
        .docx-modal-preview th {
          background: #f8fafc;
          font-weight: 600;
          text-align: left;
          padding: 0.625rem 0.875rem;
          border: 1px solid #e2e8f0;
          color: #374151;
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .docx-modal-preview td {
          padding: 0.625rem 0.875rem;
          border: 1px solid #e2e8f0;
          color: #4b5563;
          vertical-align: top;
        }
        .docx-modal-preview tr:nth-child(even) td {
          background: #fafafa;
        }
        .docx-modal-preview tr:hover td {
          background: #f1f5f9;
        }
        .docx-modal-preview blockquote {
          border-left: 3px solid #6366f1;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #64748b;
          font-style: italic;
        }
        .docx-modal-preview code {
          font-family: ui-monospace, monospace;
          font-size: 0.8125rem;
          background: #f1f5f9;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          color: #6366f1;
        }
      `}</style>
    </>
  )
}
