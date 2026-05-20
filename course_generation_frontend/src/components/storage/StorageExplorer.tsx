import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ElementType } from 'react'
import {
  Folder,
  FolderOpen,
  File,
  FileText,
  Code2,
  ImageIcon,
  AlignLeft,
  Home,
  ChevronRight,
  Search,
  RefreshCw,
  HardDrive,
  Files,
  CloudOff,
  X,
  Cloud,
  MonitorSpeaker,
  FileSpreadsheet,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  browseStorage,
  storageFileUrl,
  type BrowseResponse,
  type StorageEntry,
  type StorageSource,
} from '@/lib/storageApi'
import { FilePreviewDialog } from './FilePreviewDialog'

function formatBytes(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`
}

type FileTypeDef = {
  Icon: ElementType
  color: string
  bg: string
  badge: string
  label: string
}

const FILE_TYPE_MAP: Record<string, FileTypeDef> = {
  '.docx': { Icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', badge: 'bg-blue-100 text-blue-700', label: 'DOCX' },
  '.doc': { Icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', badge: 'bg-blue-100 text-blue-700', label: 'DOC' },
  '.json': { Icon: Code2, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', badge: 'bg-amber-100 text-amber-700', label: 'JSON' },
  '.png': { Icon: ImageIcon, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', badge: 'bg-purple-100 text-purple-700', label: 'PNG' },
  '.jpg': { Icon: ImageIcon, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', badge: 'bg-purple-100 text-purple-700', label: 'JPG' },
  '.jpeg': { Icon: ImageIcon, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', badge: 'bg-purple-100 text-purple-700', label: 'JPEG' },
  '.gif': { Icon: ImageIcon, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', badge: 'bg-purple-100 text-purple-700', label: 'GIF' },
  '.txt': { Icon: AlignLeft, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', badge: 'bg-slate-100 text-slate-600', label: 'TXT' },
  '.csv': { Icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', label: 'CSV' },
}

function getFileType(extension?: string): FileTypeDef {
  const key = (extension ?? '').toLowerCase()
  return (
    FILE_TYPE_MAP[key] ?? {
      Icon: File,
      color: 'text-slate-500',
      bg: 'bg-slate-50 border-slate-200',
      badge: 'bg-slate-100 text-slate-500',
      label: extension?.replace('.', '').toUpperCase() || 'FILE',
    }
  )
}

function fileExtension(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])

function isImageEntry(entry: StorageEntry): boolean {
  const ext = (entry.extension ?? fileExtension(entry.name)).toLowerCase()
  return IMAGE_EXTENSIONS.has(ext)
}

function buildBreadcrumbs(prefix: string) {
  if (!prefix) return []
  const parts = prefix.replace(/\/$/, '').split('/').filter(Boolean)
  return parts.map((part, i) => ({
    label: part,
    path: parts.slice(0, i + 1).join('/') + '/',
  }))
}

function FolderCard({
  entry,
  onClick,
  animDelay,
}: {
  entry: StorageEntry
  onClick: () => void
  animDelay: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-slate-200/80 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200/80 hover:shadow-[0_6px_24px_0_rgb(99,102,241,0.1)] card-accent overflow-hidden relative scale-in"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="relative flex items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50/80 border border-indigo-100">
          <Folder size={20} className="text-indigo-500 group-hover:opacity-0 absolute" />
          <FolderOpen size={20} className="text-indigo-600 opacity-0 group-hover:opacity-100 absolute" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-700">
            {entry.name}
          </p>
          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap text-[11px] text-slate-400">
            {entry.fileCount !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Files size={10} />
                {entry.fileCount} items
              </span>
            )}
            {entry.size !== undefined && entry.size > 0 && (
              <span>{formatBytes(entry.size)}</span>
            )}
          </div>
        </div>
        <ChevronRight size={12} className="text-slate-400 shrink-0 mt-1" />
      </div>
    </button>
  )
}

function ImageFileCard({
  entry,
  source,
  animDelay,
}: {
  entry: StorageEntry
  source: StorageSource
  animDelay: number
}) {
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const url = storageFileUrl(entry.path, source)
  const ext = (entry.extension ?? fileExtension(entry.name)).toLowerCase()
  const { badge, label, color } = getFileType(ext)
  const showSkeleton = !loaded && !loadFailed

  const onImgError = () => {
    setLoadFailed(true)
    setLoaded(false)
  }

  return (
    <figure
      className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_1px_4px_0_rgb(0,0,0,0.05)] scale-in"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="relative flex items-center justify-center h-[180px] bg-slate-50 overflow-hidden">
        {showSkeleton && (
          <div className="absolute inset-0 flex flex-col gap-2 p-3" aria-hidden>
            <div className="skeleton flex-1 w-full rounded-lg min-h-[120px]" />
            <div className="skeleton h-2.5 w-2/3 rounded" />
          </div>
        )}
        {loadFailed ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <ImageIcon size={32} className={color} />
            <span className="text-[10px] font-medium">Failed to load</span>
          </div>
        ) : (
          <img
            src={url}
            alt={entry.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={onImgError}
            className={cn(
              'relative z-[1] w-full h-full max-h-[180px] object-contain transition-opacity duration-300',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-slate-100 bg-white">
        <p className="text-xs font-semibold text-slate-800 truncate flex-1" title={entry.name}>
          {entry.name}
        </p>
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase shrink-0', badge)}>
          {label}
        </span>
      </figcaption>
    </figure>
  )
}

function FileCard({
  entry,
  animDelay,
  onOpen,
}: {
  entry: StorageEntry
  animDelay: number
  onOpen: () => void
}) {
  const { Icon, color, bg, badge, label } = getFileType(entry.extension)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full text-left rounded-2xl border border-slate-200/80 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200/80 hover:shadow-[0_4px_18px_0_rgb(0,0,0,0.06)] overflow-hidden relative scale-in cursor-pointer"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="relative flex items-start gap-4">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border', bg)}>
          <Icon size={20} className={color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-700" title={entry.name}>
            {entry.name}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase', badge)}>
              {label}
            </span>
            {entry.size !== undefined && (
              <span className="text-[11px] text-slate-400">{formatBytes(entry.size)}</span>
            )}
          </div>
          <p className="text-[10px] text-indigo-500 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to open
          </p>
        </div>
      </div>
    </button>
  )
}

export interface StorageExplorerProps {
  title: string
  subtitle: string
  headerIcon: ElementType
  source: StorageSource
  emptyHint: string
  /** When set, only files with these extensions are shown (e.g. ['.docx']). */
  fileExtensions?: string[]
}

export function StorageExplorer({
  title,
  subtitle,
  headerIcon: HeaderIcon,
  source,
  emptyHint,
  fileExtensions,
}: StorageExplorerProps) {
  const [prefix, setPrefix] = useState('')
  const [search, setSearch] = useState('')
  const [previewEntry, setPreviewEntry] = useState<StorageEntry | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const {
    data: browseData,
    isLoading,
    isFetching,
    error: browseError,
    refetch,
  } = useQuery({
    queryKey: ['storage-browse', source, prefix] as const,
    queryFn: ({ signal }) => browseStorage(prefix, source, signal),
    staleTime: 30_000,
    retry: false,
    refetchOnMount: false,
  })

  const data = browseData ?? null
  const error = browseError
    ? browseError instanceof Error
      ? browseError.message
      : 'Failed to load files'
    : null
  const showLoading = isLoading || (isFetching && !data)

  const breadcrumbs = buildBreadcrumbs(prefix)
  const allEntries = data?.entries ?? []
  const extSet = fileExtensions?.map((e) => e.toLowerCase())
  const byExtension = extSet
    ? allEntries.filter(
        (e) =>
          e.entryType === 'folder' ||
          extSet.includes((e.extension ?? fileExtension(e.name)).toLowerCase()),
      )
    : allEntries
  const filtered = search
    ? byExtension.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : byExtension
  const folders = filtered.filter((e) => e.entryType === 'folder')
  const files = filtered.filter((e) => e.entryType === 'file')
  const imageFiles = files.filter(isImageEntry)
  const otherFiles = files.filter((e) => !isImageEntry(e))
  const hasBoth = folders.length > 0 && files.length > 0
  const isEmpty =
    !showLoading && !error && data !== null && folders.length === 0 && files.length === 0

  return (
    <div className="flex-1 overflow-y-auto bg-[#f4f6f9]">
      <FilePreviewDialog
        entry={previewEntry}
        source={source}
        onClose={() => setPreviewEntry(null)}
      />

      <div className="border-b border-slate-200/80 bg-white px-8 py-7 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_4px_14px_0_rgb(99,102,241,0.4)]">
                <HeaderIcon size={20} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
                  {data && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border',
                        data.source === 'azure'
                          ? 'bg-sky-50 text-sky-600 border-sky-100'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100',
                      )}
                    >
                      {data.source === 'azure' ? <Cloud size={9} /> : <MonitorSpeaker size={9} />}
                      {data.source === 'azure' ? 'Azure Blob' : 'Local'}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} />
              Refresh
            </button>
          </div>
          {data && !showLoading && (
            <div className="mt-5 flex items-center gap-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <span>
                <strong className="text-slate-700">{data.totalFolders}</strong> folders
              </span>
              <span className="h-3 w-px bg-slate-200" />
              <span>
                <strong className="text-slate-700">{data.totalFiles}</strong> files
              </span>
              {data.totalSize > 0 && (
                <>
                  <span className="h-3 w-px bg-slate-200" />
                  <span className="flex items-center gap-1">
                    <HardDrive size={10} />
                    {formatBytes(data.totalSize)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-6 space-y-5">
        <div className="flex items-center justify-between gap-4 bg-white rounded-xl border border-slate-200/80 px-4 py-3">
          <nav className="flex items-center gap-0.5 min-w-0 flex-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setPrefix('')
              }}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium shrink-0',
                !prefix ? 'text-indigo-700 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50',
              )}
            >
              <Home size={12} />
              Root
            </button>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-0.5 shrink-0">
                <ChevronRight size={12} className="text-slate-300" />
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setPrefix(crumb.path)
                  }}
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-medium truncate max-w-[180px]',
                    i === breadcrumbs.length - 1
                      ? 'text-indigo-700 bg-indigo-50'
                      : 'text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </nav>
          <div className="relative shrink-0">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-44 text-xs bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-7 py-1.5 outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-center gap-3">
            <p className="flex-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-xs font-semibold text-red-600"
            >
              Retry
            </button>
          </div>
        )}

        {showLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-white p-5 h-24 skeleton" />
            ))}
          </div>
        )}

        {!showLoading && folders.length > 0 && (
          <section>
            {hasBoth && (
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Folders ({folders.length})
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map((entry, i) => (
                <FolderCard
                  key={entry.path}
                  entry={entry}
                  animDelay={i * 30}
                  onClick={() => {
                    setSearch('')
                    setPrefix(entry.path)
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {!showLoading && imageFiles.length > 0 && (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Images ({imageFiles.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {imageFiles.map((entry, i) => (
                <ImageFileCard
                  key={entry.path}
                  entry={entry}
                  source={source}
                  animDelay={(folders.length + i) * 30}
                />
              ))}
            </div>
          </section>
        )}

        {!showLoading && otherFiles.length > 0 && (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              {imageFiles.length > 0 ? `Other files (${otherFiles.length})` : `Files (${otherFiles.length})`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherFiles.map((entry, i) => (
                <FileCard
                  key={entry.path}
                  entry={entry}
                  animDelay={(folders.length + imageFiles.length + i) * 30}
                  onOpen={() => setPreviewEntry(entry)}
                />
              ))}
            </div>
          </section>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center py-24 text-center">
            <CloudOff size={32} className="text-slate-300 mb-4" />
            <p className="text-sm font-semibold text-slate-700">
              {search ? 'No results' : 'Nothing here yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">{emptyHint}</p>
          </div>
        )}
      </div>
    </div>
  )
}
