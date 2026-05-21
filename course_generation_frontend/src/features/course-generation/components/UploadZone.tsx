import { useCallback, useRef, useState, type DragEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { cn } from '@/lib/cn'

interface UploadZoneProps {
  onFiles: (files: FileList | File[]) => void
  multiple?: boolean
  label?: string
  sublabel?: string
  disabled?: boolean
  className?: string
  accept?: string
  compact?: boolean
  onClickOverride?: () => void
}

export function UploadZone({
  onFiles,
  multiple = true,
  label = 'Drop files here',
  sublabel = 'or click to browse',
  disabled = false,
  className,
  accept = '.docx,.pdf',
  compact = false,
  onClickOverride,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      const files = e.dataTransfer.files
      if (files.length > 0) onFiles(files)
    },
    [onFiles, disabled],
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleClick = () => {
    if (disabled) return
    if (onClickOverride) {
      onClickOverride()
    } else {
      inputRef.current?.click()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFiles(files)
      e.target.value = ''
    }
  }

  const iconSize = compact ? 'h-8 w-8' : 'h-10 w-10'
  const iconInnerSize = compact ? 16 : 18
  const vertPadding = compact ? 'py-5' : 'py-9'

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload documents"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 text-center transition-all duration-200 cursor-pointer group',
        vertPadding,
        isDragging
          ? 'border-indigo-400 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 scale-[1.01]'
          : 'border-slate-200 bg-slate-50/40 hover:border-indigo-200/80 hover:bg-gradient-to-br hover:from-indigo-50/40 hover:to-violet-50/30',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-xl transition-all duration-200',
          iconSize,
          isDragging
            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_4px_16px_0_rgb(99,102,241,0.4)] scale-110'
            : 'bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 group-hover:ring-indigo-200 group-hover:text-indigo-400',
        )}
      >
        <UploadCloud size={iconInnerSize} />
      </div>

      {/* Text */}
      <div className={cn('space-y-0.5', compact ? '' : 'mt-0.5')}>
        <p
          className={cn(
            'font-semibold transition-colors duration-150',
            compact ? 'text-[12px]' : 'text-[13px]',
            isDragging ? 'text-indigo-700' : 'text-slate-600 group-hover:text-slate-700',
          )}
        >
          {isDragging ? 'Release to upload' : label}
        </p>
        <p className={cn('text-slate-400', compact ? 'text-[11px]' : 'text-[12px]')}>
          {sublabel}
        </p>
      </div>

      {/* Drag-active ring */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-indigo-400/50" />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  )
}
