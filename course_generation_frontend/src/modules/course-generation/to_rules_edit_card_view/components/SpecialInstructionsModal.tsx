import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, MessageSquarePlus, X } from 'lucide-react'

interface SpecialInstructionsModalProps {
  onConfirm: (instructions: string) => void
  onCancel: () => void
}

export const SpecialInstructionsModal = ({ onConfirm, onCancel }: SpecialInstructionsModalProps) =>
  createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_2px_8px_0_rgb(139,92,246,0.3)]">
              <MessageSquarePlus size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                Special Instructions
              </h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Optional — customize how the course is written
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body — needs local state so we keep it as a component with hook */}
        <SpecialInstructionsBody onConfirm={onConfirm} onCancel={onCancel} />
      </div>
    </div>,
    document.body,
  )

const SpecialInstructionsBody = ({ onConfirm, onCancel }: SpecialInstructionsModalProps) => {
  const [instructions, setInstructions] = useState('')

  return (
    <>
      <div className="p-5 space-y-3">
        <p className="text-[13px] text-slate-600 leading-relaxed">
          Do you want to add any special instructions for generating this course?
        </p>
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Examples</p>
          <ul className="text-[12px] text-slate-500 space-y-0.5">
            <li>· Focus more on compliance and regulatory requirements</li>
            <li>· Include more real-world case studies and examples</li>
            <li>· Use beginner-friendly language throughout</li>
            <li>· Emphasize underwriting considerations</li>
            <li>· Add practical decision-making scenarios</li>
          </ul>
        </div>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Enter any special instructions here (optional)…"
          rows={4}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-5 pb-5">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-4 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(instructions)}
          className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-[0_2px_8px_0_rgb(99,102,241,0.35)] transition-all"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} />
            Generate Course
          </span>
        </button>
      </div>
    </>
  )
}
