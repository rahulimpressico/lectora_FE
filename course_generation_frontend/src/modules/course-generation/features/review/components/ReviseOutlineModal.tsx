import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, Sparkles, Wand2, X } from 'lucide-react'
import { useReviseTO } from '../hooks/useReviseTO'
import { cn } from '@/lib/cn'
import { DialogContent, DialogTitle } from '@/shared/components/Dialog'

interface ReviseOutlineModalProps {
  onClose: () => void
}

export function ReviseOutlineModal({ onClose }: ReviseOutlineModalProps) {
  const [prompt, setPrompt] = useState('')
  const { revise, isPending, isError, error, reset } = useReviseTO()

  // Close automatically after a successful revision
  const wasPendingRef = useRef(false)
  useEffect(() => {
    if (wasPendingRef.current && !isPending && !isError) onClose()
    wasPendingRef.current = isPending
  }, [isPending, isError, onClose])

  const handleSubmit = () => {
    if (!prompt.trim() || isPending) return
    reset()
    revise(prompt.trim())
  }

  return (
    <DialogContent open={true} onClose={onClose} closeOnInteractOutside={!isPending}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_2px_8px_0_rgb(99,102,241,0.3)]">
              <Wand2 size={16} className="text-white" />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-bold text-slate-900 leading-tight">
                Ask the Assistant to Revise
              </DialogTitle>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Describe the changes you want — the current outline will be updated
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Examples</p>
            <ul className="text-[12px] text-slate-500 space-y-0.5">
              <li>· Make this course more interactive with case studies and knowledge checks</li>
              <li>· Reduce the number of sections to 6 and focus on core concepts</li>
              <li>· Add a dedicated section on regulatory compliance requirements</li>
              <li>· Shorten section descriptions and make language more concise</li>
            </ul>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); if (isError) reset() }}
            placeholder="Describe how you'd like the Training Outline revised…"
            rows={5}
            disabled={isPending}
            className={cn(
              'w-full resize-none rounded-xl border bg-white px-4 py-3 text-[13px] text-slate-800',
              'outline-none placeholder:text-slate-400 transition-all',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isError
                ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50'
                : 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50',
            )}
          />

          {isError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-700">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error?.message ?? 'An error occurred. Please try again.'}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-9 px-4 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          {isPending ? (
            <button
              type="button"
              disabled
              className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 opacity-80 flex items-center gap-2 cursor-not-allowed"
            >
              <Loader2 size={13} className="animate-spin" />
              Revising…
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className={cn(
                'h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5',
                'shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                isError
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-[0_2px_8px_0_rgb(99,102,241,0.35)]',
              )}
            >
              <Sparkles size={13} />
              {isError ? 'Retry' : 'Apply & Regenerate'}
            </button>
          )}
        </div>
      </div>
    </DialogContent>
  )
}
