import { useState, useEffect, useMemo, useCallback } from 'react'
import type { DocumentCost } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortField = 'name' | 'lastUpdated' | 'cost'
export type SortDir   = 'asc' | 'desc'
export type StatusFilter = DocumentCost['status'] | 'all'

export interface StatusCounts {
  all: number
  completed: number
  'in-progress': number
  failed: number
}

export interface UseDocumentListReturn {
  // Search
  searchQuery:    string
  setSearchQuery: (q: string) => void

  // Status filter
  statusFilter:    StatusFilter
  setStatusFilter: (f: StatusFilter) => void

  // Sort
  sortField:   SortField
  sortDir:     SortDir
  toggleSort:  (field: SortField) => void

  // Pagination
  page:       number
  totalPages: number
  pageSize:   number
  setPage:    (p: number) => void
  pageNumbers: (number | '…')[]

  // Results
  visibleDocuments: DocumentCost[]
  filteredCount:    number
  totalCount:       number
  statusCounts:     StatusCounts
  rangeText:        string
  isFiltered:       boolean

  // Actions
  clearFilters: () => void
}

// ─── Page-number algorithm ─────────────────────────────────────────────────────
// Returns an array of numbers and '…' sentinels, max 7 items wide.

function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | '…')[] = [1]

  const left  = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)

  if (left > 2)           pages.push('…')
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < total - 1)  pages.push('…')

  pages.push(total)
  return pages
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 9

export function useDocumentList(documents: DocumentCost[]): UseDocumentListReturn {
  const [searchQuery,    setSearchQueryRaw] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter,   _setStatusFilter]  = useState<StatusFilter>('all')
  const [sortField,      setSortField]       = useState<SortField>('lastUpdated')
  const [sortDir,        setSortDir]         = useState<SortDir>('desc')
  const [page,           setPageRaw]         = useState(1)

  // ── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 250)
    return () => clearTimeout(id)
  }, [searchQuery])

  // ── Reset page on any filter/sort change ────────────────────────────────────
  const setPage = useCallback((p: number) => setPageRaw(p), [])

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryRaw(q)
    setPageRaw(1)
  }, [])

  const setStatusFilter = useCallback((f: StatusFilter) => {
    _setStatusFilter(f)
    setPageRaw(1)
  }, [])

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return field
      }
      setSortDir(field === 'lastUpdated' || field === 'cost' ? 'desc' : 'asc')
      return field
    })
    setPageRaw(1)
  }, [])

  const clearFilters = useCallback(() => {
    setSearchQueryRaw('')
    setDebouncedQuery('')
    _setStatusFilter('all')
    setSortField('lastUpdated')
    setSortDir('desc')
    setPageRaw(1)
  }, [])

  // ── Status counts (computed from the original unfiltered list) ──────────────
  const statusCounts = useMemo<StatusCounts>(() => ({
    all:           documents.length,
    completed:     documents.filter((d) => d.status === 'completed').length,
    'in-progress': documents.filter((d) => d.status === 'in-progress').length,
    failed:        documents.filter((d) => d.status === 'failed').length,
  }), [documents])

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = documents

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
      result = result.filter(
        (d) =>
          d.documentName.toLowerCase().includes(q) ||
          d.documentType.toLowerCase().includes(q),
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((d) => d.status === statusFilter)
    }

    return result
  }, [documents, debouncedQuery, statusFilter])

  // ── Sort ────────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') {
        cmp = a.documentName.localeCompare(b.documentName)
      } else if (sortField === 'lastUpdated') {
        cmp = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
      } else if (sortField === 'cost') {
        cmp = a.totalCost - b.totalCost
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))

  // Clamp page if filters shrink total pages
  const safePage = Math.min(page, totalPages)

  const visibleDocuments = useMemo(
    () => sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sorted, safePage],
  )

  const filteredCount = sorted.length
  const totalCount    = documents.length

  const start = filteredCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const end   = Math.min(safePage * PAGE_SIZE, filteredCount)

  const rangeText = filteredCount === 0
    ? 'No documents'
    : `Showing ${start}–${end} of ${filteredCount}${filteredCount < totalCount ? ` filtered from ${totalCount}` : ''}`

  const isFiltered =
    debouncedQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    sortField !== 'lastUpdated' ||
    sortDir !== 'desc'

  const pageNumbers = buildPageNumbers(safePage, totalPages)

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortField,
    sortDir,
    toggleSort,
    page: safePage,
    totalPages,
    pageSize: PAGE_SIZE,
    setPage,
    pageNumbers,
    visibleDocuments,
    filteredCount,
    totalCount,
    statusCounts,
    rangeText,
    isFiltered,
    clearFilters,
  }
}
