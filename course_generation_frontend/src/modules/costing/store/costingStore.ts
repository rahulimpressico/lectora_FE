import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { DocumentCost } from '../types'
import { fetchDocumentCostDetail } from '../api/api'

interface CostingStoreState {
  selectedDocument: DocumentCost | null
  isDocumentLoading: boolean
  documentError: string | null
  documentFetchId: string | null

  selectDocument: (documentId: string) => Promise<void>
  clearSelectedDocument: () => void
}

let documentFetchInFlight: Promise<void> | null = null
let documentFetchTargetId: string | null = null

export const useCostingStore = create<CostingStoreState>()(
  devtools(
    (set, get) => ({
      selectedDocument: null,
      isDocumentLoading: false,
      documentError: null,
      documentFetchId: null,

      selectDocument: async (documentId) => {
        if (
          documentFetchInFlight &&
          documentFetchTargetId === documentId &&
          get().isDocumentLoading
        ) {
          return documentFetchInFlight
        }

        documentFetchTargetId = documentId
        set({ isDocumentLoading: true, documentError: null, documentFetchId: documentId })

        documentFetchInFlight = (async () => {
          try {
            const doc = await fetchDocumentCostDetail(documentId)
            if (get().documentFetchId === documentId) {
              set({ selectedDocument: doc, isDocumentLoading: false })
            }
          } catch (err) {
            if (get().documentFetchId === documentId) {
              set({
                isDocumentLoading: false,
                documentError:
                  err instanceof Error ? err.message : 'Failed to load document cost',
              })
            }
          } finally {
            if (documentFetchTargetId === documentId) {
              documentFetchInFlight = null
              documentFetchTargetId = null
            }
          }
        })()

        return documentFetchInFlight
      },

      clearSelectedDocument: () =>
        set({
          selectedDocument: null,
          isDocumentLoading: false,
          documentError: null,
          documentFetchId: null,
        }),
    }),
    { name: 'costing-store' },
  ),
)
