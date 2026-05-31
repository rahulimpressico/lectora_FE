import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { CostingSummary, DocumentCost } from '../types'
import { fetchCostingSummary, fetchDocumentCostDetail } from '../api/api'

interface CostingStoreState {
  summary: CostingSummary | null
  isLoading: boolean
  error: string | null
  selectedDocument: DocumentCost | null
  isDocumentLoading: boolean

  loadSummary: () => Promise<void>
  selectDocument: (documentId: string) => Promise<void>
  clearSelectedDocument: () => void
}

export const useCostingStore = create<CostingStoreState>()(
  devtools(
    (set) => ({
      summary: null,
      isLoading: false,
      error: null,
      selectedDocument: null,
      isDocumentLoading: false,

      loadSummary: async () => {
        set({ isLoading: true, error: null })
        try {
          const summary = await fetchCostingSummary()
          set({ summary, isLoading: false })
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load costing data',
          })
        }
      },

      selectDocument: async (documentId) => {
        set({ isDocumentLoading: true })
        try {
          const doc = await fetchDocumentCostDetail(documentId)
          set({ selectedDocument: doc, isDocumentLoading: false })
        } catch (err) {
          set({
            isDocumentLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load document detail',
          })
        }
      },

      clearSelectedDocument: () => set({ selectedDocument: null }),
    }),
    { name: 'costing-store' },
  ),
)
