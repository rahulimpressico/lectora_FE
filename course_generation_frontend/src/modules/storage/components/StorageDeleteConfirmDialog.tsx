import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { DialogContent, DialogTitle } from '@/shared/components/Dialog'

interface StorageDeleteConfirmDialogProps {
  open: boolean
  fileNames: string[]
  folderNames: string[]
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function StorageDeleteConfirmDialog({
  open,
  fileNames,
  folderNames,
  loading = false,
  onConfirm,
  onCancel,
}: StorageDeleteConfirmDialogProps) {
  const items = [
    ...folderNames.map((n) => ({ label: `${n}/`, kind: 'folder' as const })),
    ...fileNames.map((n) => ({ label: n, kind: 'file' as const })),
  ]
  const count = items.length
  const preview = items.slice(0, 6)
  const more = count - preview.length

  return (
    <DialogContent open={open} onClose={onCancel} closeOnInteractOutside={!loading}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 ring-1 ring-red-100">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <DialogTitle className="text-sm font-bold text-slate-900">
              Delete {count} item{count !== 1 ? 's' : ''}?
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Files and folders will be removed from storage. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <ul className="max-h-40 overflow-y-auto px-5 py-3 text-xs text-slate-600 space-y-1 bg-slate-50/80">
          {preview.map((item) => (
            <li key={item.label} className="truncate font-mono">
              {item.kind === 'folder' ? `[folder] ${item.label}` : item.label}
            </li>
          ))}
          {more > 0 && <li className="text-slate-400 italic">…and {more} more</li>}
        </ul>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>
            Delete
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}
