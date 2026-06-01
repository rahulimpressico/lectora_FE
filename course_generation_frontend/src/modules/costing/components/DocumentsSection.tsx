import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  SearchX,
  FolderOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { DocumentCost } from '../types'
import { useDocumentList } from '../hooks/useDocumentList'
import type { SortField, StatusFilter } from '../hooks/useDocumentList'
import { DocumentCard } from './DocumentCard'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  documents: DocumentCost[]
  isLoading: boolean
  onSelectDocument: (id: string) => void
}

// ─── Small reusable atoms ─────────────────────────────────────────────────────

function SortIcon({ field, activeField, dir }: { field: SortField; activeField: SortField; dir: 'asc' | 'desc' }) {
  if (field !== activeField) return <ChevronsUpDown size={12} className="text-slate-300" />
  return dir === 'asc'
    ? <ChevronUp size={12} className="text-indigo-500" />
    : <ChevronDown size={12} className="text-indigo-500" />
}

const STATUS_META: Record<StatusFilter, { label: string; icon: typeof CheckCircle; activeCls: string; countCls: string }> = {
  all:          { label: 'All',         icon: FolderOpen,    activeCls: 'bg-indigo-600 text-white border-indigo-600',         countCls: 'bg-indigo-500/20 text-indigo-100' },
  completed:    { label: 'Completed',   icon: CheckCircle,   activeCls: 'bg-emerald-600 text-white border-emerald-600',       countCls: 'bg-emerald-500/20 text-emerald-100' },
  'in-progress':{ label: 'In Progress', icon: Clock,         activeCls: 'bg-amber-500 text-white border-amber-500',           countCls: 'bg-amber-400/20 text-amber-100' },
  failed:       { label: 'Failed',      icon: AlertCircle,   activeCls: 'bg-red-500 text-white border-red-500',               countCls: 'bg-red-400/20 text-red-100' },
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[280px] rounded-2xl border border-slate-200/70 bg-white overflow-hidden">
          <div className="h-full w-full animate-pulse bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100" />
        </div>
      ))}
    </div>
  )
}

// ─── Empty states ──────────────────────────────────────────────────────────────

function EmptyAll() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <FolderOpen size={22} className="text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">No processed documents yet</p>
      <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
        As soon as course or TO runs complete with trace-backed costing, they will appear here for drilldown analysis.
      </p>
    </motion.div>
  )
}

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100/60">
        <SearchX size={22} className="text-indigo-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">No results found</p>
      {query ? (
        <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
          No documents match <span className="font-semibold text-slate-600">&ldquo;{query}&rdquo;</span>.
          Try a different search term or clear the filters.
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
          No documents match the current filter. Try selecting a different status.
        </p>
      )}
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
      >
        <X size={12} />
        Clear filters
      </button>
    </motion.div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  pageNumbers,
  onPage,
}: {
  page: number
  totalPages: number
  pageNumbers: (number | '…')[]
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      {/* Prev */}
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Page numbers */}
      {pageNumbers.map((num, i) =>
        num === '…' ? (
          <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-slate-400 select-none">
            …
          </span>
        ) : (
          <button
            key={num}
            type="button"
            onClick={() => onPage(num)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-all',
              num === page
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.30)]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600',
            )}
          >
            {num}
          </button>
        ),
      )}

      {/* Next */}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ─── Sort header button ───────────────────────────────────────────────────────

function SortButton({
  field,
  label,
  activeField,
  dir,
  onClick,
}: {
  field: SortField
  label: string
  activeField: SortField
  dir: 'asc' | 'desc'
  onClick: (f: SortField) => void
}) {
  const isActive = field === activeField
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all',
        isActive
          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
          : 'text-slate-500 border border-transparent hover:bg-slate-100 hover:text-slate-700',
      )}
    >
      {label}
      <SortIcon field={field} activeField={activeField} dir={dir} />
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DocumentsSection({ documents, isLoading, onSelectDocument }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)

  const {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    sortField, sortDir, toggleSort,
    page, totalPages, pageNumbers, setPage,
    visibleDocuments,
    filteredCount, totalCount,
    statusCounts,
    rangeText,
    isFiltered,
    clearFilters,
  } = useDocumentList(documents)

  const handlePageChange = (p: number) => {
    setPage(p)
    // Scroll section into view so user sees the new page without manual scrolling
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (isLoading && documents.length === 0) {
    return <SkeletonGrid />
  }

  if (!isLoading && documents.length === 0) {
    return <EmptyAll />
  }

  return (
    <div className="space-y-5" ref={gridRef}>

      <div className="rounded-[22px] border border-slate-200/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(248,250,255,0.98)_100%)] p-5 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-500">
              Document Cost Explorer
            </p>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
              Analyze cost per course run
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Search processed runs, compare document-level spend, and open a full drilldown for exact model and stage contribution.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Documents', value: totalCount },
              { label: 'Filtered', value: filteredCount },
              { label: 'Pages', value: totalPages },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-white px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_8px_0_rgba(0,0,0,0.04)] overflow-hidden">

        {/* Row 1: search + sort controls */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-slate-100/80">

          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or type…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-8 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sort buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <SlidersHorizontal size={12} className="text-slate-400 mr-1" />
            <SortButton field="lastUpdated" label="Date"   activeField={sortField} dir={sortDir} onClick={toggleSort} />
            <SortButton field="cost"        label="Cost"   activeField={sortField} dir={sortDir} onClick={toggleSort} />
            <SortButton field="name"        label="Name"   activeField={sortField} dir={sortDir} onClick={toggleSort} />
          </div>

          {/* Result count */}
          <div className="shrink-0 ml-auto">
            <span className="text-[11px] text-slate-400 font-medium tabular-nums">
              {totalCount} total
              {isFiltered && (
                <span className="ml-1 text-indigo-500 font-semibold">
                  · {filteredCount} filtered
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Row 2: status filter chips */}
        <div className="flex items-center gap-2 px-5 py-3 overflow-x-auto scrollbar-none">
          {(Object.keys(STATUS_META) as StatusFilter[]).map((key) => {
            const meta  = STATUS_META[key]
            const count = statusCounts[key]
            const isOn  = statusFilter === key
            const Icon  = meta.icon

            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-150',
                  isOn
                    ? meta.activeCls
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
                )}
              >
                <Icon size={10} />
                {meta.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums',
                    isOn ? meta.countCls : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}

          {isFiltered && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-red-500 hover:border-red-200 transition-all ml-auto"
            >
              <X size={10} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Range label ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[11px] text-slate-400 font-medium">{rangeText}</p>
        {totalPages > 1 && (
          <p className="text-[11px] text-slate-400 font-medium">
            Page {page} of {totalPages}
          </p>
        )}
      </div>

      {/* ── Grid / empty states ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {filteredCount === 0 ? (
          <NoResults
            key="no-results"
            query={searchQuery}
            onClear={clearFilters}
          />
        ) : (
          <motion.div
            key={`page-${page}-${statusFilter}-${sortField}-${sortDir}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {visibleDocuments.map((doc, i) => (
              <DocumentCard
                key={doc.documentId}
                doc={doc}
                onClick={onSelectDocument}
                delay={i * 0.04}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {filteredCount > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          onPage={handlePageChange}
        />
      )}
    </div>
  )
}
