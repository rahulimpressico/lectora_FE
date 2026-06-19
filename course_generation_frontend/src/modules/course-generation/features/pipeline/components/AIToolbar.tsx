import { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  RefreshCw,
  PenLine,
  SmilePlus,
  AlignLeft,
  ChevronsUpDown,
  Minimize2,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { AIOperationType } from '../../../types/editor'

interface AIToolbarProps {
  sectionId: string
  content: string
  isProcessing: boolean
  currentOperation?: AIOperationType
  onTrigger: (operation: AIOperationType, content: string) => void
  onOpenModal: (operation: 'rewrite' | 'improve_tone', content: string) => void
  disabled?: boolean
}

interface OperationDef {
  type: AIOperationType
  label: string
  description: string
  Icon: React.ElementType
  group: 'primary' | 'secondary'
}

const OPERATION_ICON_COLOR: Record<AIOperationType, string> = {
  regenerate: 'text-orange-500',
  rewrite: 'text-indigo-500',
  improve_tone: 'text-pink-500',
  summarize: 'text-blue-500',
  expand: 'text-violet-500',
  simplify: 'text-teal-500',
}

const AI_OPERATIONS: OperationDef[] = [
  {
    type: 'regenerate',
    label: 'Regenerate',
    description: 'Fully rewrite from learning objectives',
    Icon: RefreshCw,
    group: 'primary',
  },
  {
    type: 'rewrite',
    label: 'Rewrite by AI',
    description: 'Rewrite with custom instructions',
    Icon: PenLine,
    group: 'primary',
  },
  {
    type: 'improve_tone',
    label: 'Improve Tone',
    description: 'Set a custom tone or style',
    Icon: SmilePlus,
    group: 'secondary',
  },
  {
    type: 'summarize',
    label: 'Summarize',
    description: 'Condense to key points (~50% length)',
    Icon: AlignLeft,
    group: 'secondary',
  },
  {
    type: 'expand',
    label: 'Expand',
    description: 'Add depth, examples, and elaboration',
    Icon: ChevronsUpDown,
    group: 'secondary',
  },
  {
    type: 'simplify',
    label: 'Simplify',
    description: 'Plain language, shorter sentences',
    Icon: Minimize2,
    group: 'secondary',
  },
]

const OPERATION_LABEL: Record<AIOperationType, string> = {
  regenerate: 'Regenerating…',
  rewrite: 'Rewriting…',
  improve_tone: 'Improving tone…',
  summarize: 'Summarizing…',
  expand: 'Expanding…',
  simplify: 'Simplifying…',
}

export function AIToolbar({
  sectionId: _sectionId,
  content,
  isProcessing,
  currentOperation,
  onTrigger,
  onOpenModal,
  disabled,
}: AIToolbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (isProcessing) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg">
        <Loader2 size={12} className="animate-spin" />
        {currentOperation ? OPERATION_LABEL[currentOperation] : 'AI is working…'}
      </div>
    )
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all',
          'text-brand-600 bg-brand-50 border-brand-200 hover:bg-brand-100',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        <Sparkles size={12} />
        AI Tools
        <ChevronDown
          size={11}
          className={cn('transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20 scale-in">
          {/* Primary ops */}
          <div className="p-1.5">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Generation
            </p>
            {AI_OPERATIONS.filter((op) => op.group === 'primary').map((op) => (
              <OperationItem
                key={op.type}
                op={op}
                onSelect={() => {
                  setIsOpen(false)
                  if (op.type === 'rewrite') {
                    onOpenModal('rewrite', content)
                  } else {
                    onTrigger(op.type, content)
                  }
                }}
              />
            ))}
          </div>

          <div className="border-t border-slate-100 p-1.5">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Refinement
            </p>
            {AI_OPERATIONS.filter((op) => op.group === 'secondary').map((op) => (
              <OperationItem
                key={op.type}
                op={op}
                onSelect={() => {
                  setIsOpen(false)
                  if (op.type === 'improve_tone') {
                    onOpenModal('improve_tone', content)
                  } else {
                    onTrigger(op.type, content)
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function OperationItem({
  op,
  onSelect,
}: {
  op: OperationDef
  onSelect: () => void
}) {
  const { Icon } = op
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-start gap-2.5 px-2.5 py-2 text-left rounded-lg hover:bg-slate-50 transition-colors group"
    >
      <div className={cn(
        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 group-hover:bg-brand-100 transition-colors',
      )}>
        <Icon size={12} className={OPERATION_ICON_COLOR[op.type]} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-700">{op.label}</p>
        <p className="text-[10px] text-slate-400 leading-snug">{op.description}</p>
      </div>
    </button>
  )
}
