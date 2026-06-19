import { useRef, useState, useCallback, useEffect } from 'react'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ThreePanelLayoutProps {
  left: React.ReactNode
  middle: React.ReactNode
  right: React.ReactNode
}

const PANEL_MIN = 16   // minimum % width per panel
const PANEL_MAX = 65   // maximum % width per panel

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

interface DividerProps {
  onDragStart: (e: React.MouseEvent) => void
  isActive: boolean
}

function ResizeDivider({ onDragStart, isActive }: DividerProps) {
  return (
    <div
      onMouseDown={onDragStart}
      className={cn(
        'group relative flex w-1.5 shrink-0 cursor-col-resize items-center justify-center select-none z-20',
        isActive ? 'bg-indigo-200' : 'bg-slate-150 hover:bg-indigo-100',
        'transition-colors duration-100',
      )}
      title="Drag to resize"
      role="separator"
      aria-orientation="vertical"
    >
      <div
        className={cn(
          'flex h-8 w-4 items-center justify-center rounded-full transition-all',
          isActive
            ? 'bg-indigo-500 text-white shadow-md'
            : 'bg-slate-200 text-slate-400 opacity-0 group-hover:opacity-100',
        )}
      >
        <GripVertical size={10} />
      </div>
    </div>
  )
}

export function ThreePanelLayout({ left, middle, right }: ThreePanelLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftPct, setLeftPct] = useState(28)
  const [midPct,  setMidPct]  = useState(38)
  // rightPct = 100 - leftPct - midPct

  const draggingRef = useRef<'left-mid' | 'mid-right' | null>(null)
  const startXRef   = useRef(0)
  const startLRef   = useRef(0)
  const startMRef   = useRef(0)
  const [activeDivider, setActiveDivider] = useState<'left-mid' | 'mid-right' | null>(null)

  const startDrag = useCallback(
    (divider: 'left-mid' | 'mid-right') =>
      (e: React.MouseEvent) => {
        e.preventDefault()
        draggingRef.current = divider
        startXRef.current   = e.clientX
        startLRef.current   = leftPct
        startMRef.current   = midPct
        setActiveDivider(divider)
      },
    [leftPct, midPct],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return
      const totalW = containerRef.current.getBoundingClientRect().width
      const deltaPct = ((e.clientX - startXRef.current) / totalW) * 100

      if (draggingRef.current === 'left-mid') {
        const newLeft = clamp(startLRef.current + deltaPct, PANEL_MIN, PANEL_MAX)
        const rightPct = 100 - startLRef.current - startMRef.current
        const newMid   = clamp(startMRef.current - (newLeft - startLRef.current), PANEL_MIN, 100 - newLeft - rightPct)
        setLeftPct(newLeft)
        setMidPct(newMid)
      } else {
        const newMid   = clamp(startMRef.current + deltaPct, PANEL_MIN, PANEL_MAX)
        const rightPct = clamp(100 - startLRef.current - newMid, PANEL_MIN, PANEL_MAX)
        if (rightPct >= PANEL_MIN) setMidPct(newMid)
      }
    }

    const onUp = () => {
      draggingRef.current = null
      setActiveDivider(null)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  const rightPct = 100 - leftPct - midPct

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full w-full overflow-hidden',
        activeDivider ? 'cursor-col-resize select-none' : '',
      )}
    >
      {/* Left panel */}
      <div
        className="flex flex-col min-w-0 overflow-hidden border-r border-slate-200"
        style={{ width: `${leftPct}%` }}
      >
        {left}
      </div>

      <ResizeDivider
        onDragStart={startDrag('left-mid')}
        isActive={activeDivider === 'left-mid'}
      />

      {/* Middle panel */}
      <div
        className="flex flex-col min-w-0 overflow-hidden border-r border-slate-200"
        style={{ width: `${midPct}%` }}
      >
        {middle}
      </div>

      <ResizeDivider
        onDragStart={startDrag('mid-right')}
        isActive={activeDivider === 'mid-right'}
      />

      {/* Right panel */}
      <div
        className="flex flex-col min-w-0 overflow-hidden"
        style={{ width: `${rightPct}%` }}
      >
        {right}
      </div>
    </div>
  )
}
