import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Folder, FileText, ChevronRight, Home, X, Plus, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { browseStorage } from '@/lib/storageApi'
import type { StorageEntry } from '@/lib/storageApi'

interface InlineAzureBrowserProps {
  accept?: string[]
  onAdd: (entries: Array<{ name: string; path: string; size?: number }>) => void
  addedPaths?: Set<string>
}

function buildBreadcrumbs(prefix: string): Array<{ label: string; path: string }> {
  const parts = prefix.split('/').filter(Boolean)
  const crumbs: Array<{ label: string; path: string }> = [{ label: 'All Files', path: '' }]
  let acc = ''
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part
    crumbs.push({ label: part, path: `${acc}/` })
  }
  return crumbs
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function InlineAzureBrowser({
  accept = ['.docx', '.pdf'],
  onAdd,
  addedPaths = new Set(),
}: InlineAzureBrowserProps) {
  const [prefix, setPrefix] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Map<string, StorageEntry>>(new Map())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['azure-browse-inline', prefix],
    queryFn: ({ signal }) => browseStorage(prefix, 'uploads', signal),
    retry: 1,
  })

  const breadcrumbs = buildBreadcrumbs(prefix)
  const entries = data?.entries ?? []

  const filtered = search.trim()
    ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase().trim()))
    : entries

  const matchesAccept = useCallback(
    (entry: StorageEntry): boolean => {
      if (entry.entryType !== 'file') return false
      const name = entry.name.toLowerCase()
      return accept.some((ext) => name.endsWith(ext))
    },
    [accept],
  )

  const toggle = (entry: StorageEntry) => {
    if (!matchesAccept(entry) || addedPaths.has(entry.path)) return
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(entry.path)) next.delete(entry.path)
      else next.set(entry.path, entry)
      return next
    })
  }

  const navigate = (path: string) => {
    setPrefix(path)
    setSearch('')
  }

  const handleAdd = () => {
    if (selected.size === 0) return
    onAdd(Array.from(selected.values()).map((e) => ({ name: e.name, path: e.path, size: e.size })))
    setSelected(new Map())
  }

  const selectableEntries = filtered.filter((e) => matchesAccept(e) && !addedPaths.has(e.path))
  const allSelected = selectableEntries.length > 0 && selectableEntries.every((e) => selected.has(e.path))

  const selectAll = () => {
    setSelected((prev) => {
      const next = new Map(prev)
      for (const e of selectableEntries) next.set(e.path, e)
      return next
    })
  }
  const clearSelection = () => setSelected(new Map())

  return (
    <div className="flex flex-col gap-3">

      {/* Search */}
      <div className="relative">
        <Search
          size={13}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search files and folders…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8.5 pr-8 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50/80 transition-all"
          style={{ paddingLeft: '2.125rem' }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Breadcrumb — hidden while searching */}
      {!search && (
        <div className="flex items-center gap-0.5 flex-wrap min-h-[20px]">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.path} className="flex items-center gap-0.5 shrink-0">
              {i > 0 && <ChevronRight size={10} className="text-slate-300 mx-0.5" />}
              <button
                type="button"
                onClick={() => navigate(crumb.path)}
                disabled={i === breadcrumbs.length - 1}
                className={cn(
                  'flex items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium transition-colors',
                  i === breadcrumbs.length - 1
                    ? 'text-slate-600 cursor-default'
                    : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700',
                )}
              >
                {i === 0 && <Home size={10} className="shrink-0" />}
                {crumb.label}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File browser panel */}
      <div className="rounded-xl border border-slate-200/70 bg-white overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">

        {/* Toolbar */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3.5 py-1.5">
            <span className="text-[11px] text-slate-500">
              {search
                ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
                : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
            </span>
            {selectableEntries.length > 0 && (
              <button
                type="button"
                onClick={allSelected ? clearSelection : selectAll}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {allSelected
                  ? 'Deselect all'
                  : `Select all (${selectableEntries.length})`}
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-lg bg-slate-100"
                style={{ opacity: 1 - i * 0.18 }}
              />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <p className="text-[13px] text-slate-500">Failed to load files</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <p className="text-[13px] text-slate-400">
              {search ? 'No files match your search' : 'This folder is empty'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-[12px] font-medium text-indigo-600 hover:text-indigo-800"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100/80">
            {filtered.map((entry) => {
              if (entry.entryType === 'folder') {
                return (
                  <button
                    key={entry.path}
                    type="button"
                    onClick={() =>
                      navigate(entry.path.endsWith('/') ? entry.path : `${entry.path}/`)
                    }
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left hover:bg-slate-50 transition-colors group"
                  >
                    <Folder size={13} className="shrink-0 text-amber-500" />
                    <span className="flex-1 truncate text-[13px] font-medium text-slate-700">
                      {entry.name}
                    </span>
                    {entry.fileCount !== undefined && (
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {entry.fileCount} file{entry.fileCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    <ChevronRight
                      size={12}
                      className="shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors"
                    />
                  </button>
                )
              }

              const accepted = matchesAccept(entry)
              const isChecked = selected.has(entry.path)
              const alreadyAdded = addedPaths.has(entry.path)

              return (
                <label
                  key={entry.path}
                  className={cn(
                    'flex items-center gap-2.5 px-3.5 py-2 transition-colors select-none',
                    accepted && !alreadyAdded
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed',
                    isChecked ? 'bg-indigo-50/60 hover:bg-indigo-50/80' : 'hover:bg-slate-50/80',
                    alreadyAdded && 'bg-emerald-50/50',
                    !accepted && 'opacity-40',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked || alreadyAdded}
                    disabled={!accepted || alreadyAdded}
                    onChange={() => toggle(entry)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <FileText
                    size={13}
                    className={cn(
                      'shrink-0',
                      alreadyAdded ? 'text-emerald-500' : isChecked ? 'text-indigo-500' : 'text-slate-400',
                    )}
                  />
                  <span className="flex-1 truncate text-[13px] text-slate-700">
                    {entry.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {alreadyAdded ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Added
                      </span>
                    ) : entry.size !== undefined ? (
                      <span className="text-[11px] text-slate-400">{formatSize(entry.size)}</span>
                    ) : null}
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-slate-500">
          {selected.size > 0
            ? `${selected.size} file${selected.size !== 1 ? 's' : ''} selected`
            : 'Click files to select them'}
        </span>
        <button
          type="button"
          onClick={handleAdd}
          disabled={selected.size === 0}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all duration-200',
            selected.size > 0
              ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_2px_10px_0_rgb(99,102,241,0.35)] hover:shadow-[0_4px_16px_0_rgb(99,102,241,0.45)]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed',
          )}
        >
          <Plus size={13} />
          Add{selected.size > 0 ? ` ${selected.size}` : ''} file{selected.size !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}
