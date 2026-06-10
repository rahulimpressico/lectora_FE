import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ConfirmLeaveModalProps {
  /** Whether the modal is visible. */
  open: boolean
  /** Short heading shown in the modal. */
  title: string
  /** Body text describing what will be lost. */
  message: string
  /** Label for the destructive "leave" button (default "Leave"). */
  confirmLabel?: string
  /** Label for the safe "stay" button (default "Stay on page"). */
  cancelLabel?: string
  /** Called when the user confirms they want to leave. */
  onConfirm: () => void
  /** Called when the user decides to stay. */
  onCancel: () => void
}

/**
 * Portal-based confirmation dialog shown before destructive navigation.
 * Pressing Escape calls onCancel.
 */
export function ConfirmLeaveModal({
  open,
  title,
  message,
  confirmLabel = 'Leave',
  cancelLabel = 'Stay on page',
  onConfirm,
  onCancel,
}: ConfirmLeaveModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-[4px]"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal
        aria-labelledby="confirm-leave-title"
        className="fixed inset-0 z-[201] flex items-center justify-center p-4"
      >
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-start gap-3 px-5 pt-5 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h2
                id="confirm-leave-title"
                className="text-[15px] font-bold text-slate-900 leading-tight"
              >
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                {message}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors mt-0.5"
            >
              <X size={14} />
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 mx-5" />

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors',
                'bg-red-500 hover:bg-red-600',
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
