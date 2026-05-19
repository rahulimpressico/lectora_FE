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
}

export function UploadZone({
  onFiles,
  multiple = true,
  label = 'Drop DOCX files here',
  sublabel = 'or click to browse',
  disabled = false,
  className,
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
    if (!disabled) inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFiles(files)
      e.target.value = ''
    }
  }

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
        'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-10 text-center transition-all duration-200 cursor-pointer',
        isDragging
          ? 'border-indigo-400 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 scale-[1.01]'
          : 'border-slate-200 bg-slate-50/50 hover:border-indigo-300/70 hover:bg-slate-50',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200',
          isDragging
            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_4px_16px_0_rgb(99,102,241,0.4)] scale-110'
            : 'bg-white text-slate-400 shadow-[0_2px_8px_0_rgb(0,0,0,0.08)] ring-1 ring-slate-200/80',
        )}
      >
        <UploadCloud size={20} />
      </div>

      {/* Text */}
      <div className="space-y-1">
        <p className={cn(
          'text-sm font-semibold transition-colors duration-150',
          isDragging ? 'text-indigo-700' : 'text-slate-700',
        )}>
          {isDragging ? 'Release to upload' : label}
        </p>
        <p className="text-xs text-slate-400">
          {sublabel} &middot; <span className="font-semibold text-slate-500">.docx</span> only
        </p>
      </div>

      {/* Drag-active overlay ring */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-indigo-400/50" />
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        multiple={multiple}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  )
}
