import { Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatStorageDate, formatStorageDateShort } from '@/utils/formatDate'
import type { StorageEntry } from '@/api/storage/api'

interface Props {
  entry: Pick<StorageEntry, 'createdAt' | 'lastModified'>
  /** Compact single-line layout for narrow rows (inline browser). */
  compact?: boolean
  className?: string
}

/**
 * Consistent created / modified labels for storage browse cards and previews.
 * Always renders both lines; shows an em dash when the API did not supply a timestamp.
 */
export function StorageEntryDates({ entry, compact = false, className }: Props) {
  const created = formatStorageDateShort(entry.createdAt) ?? '—'
  const modified = formatStorageDate(entry.lastModified) ?? '—'

  if (compact) {
    return (
      <div className={cn('flex flex-col gap-0.5 text-[10px] text-slate-400', className)}>
        <span className="inline-flex items-center gap-1 truncate">
          <Calendar size={9} className="shrink-0 opacity-70" />
          <span className="truncate">Created {created}</span>
        </span>
        <span className="inline-flex items-center gap-1 truncate">
          <Clock size={9} className="shrink-0 opacity-70" />
          <span className="truncate">Modified {modified}</span>
        </span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-0.5', className)}>
      <p className="text-[10px] text-slate-400 leading-tight inline-flex items-center gap-1">
        <Calendar size={9} className="shrink-0 opacity-70" />
        <span>Created: {created}</span>
      </p>
      <p className="text-[10px] text-slate-400 leading-tight inline-flex items-center gap-1">
        <Clock size={9} className="shrink-0 opacity-70" />
        <span>Modified: {modified}</span>
      </p>
    </div>
  )
}
