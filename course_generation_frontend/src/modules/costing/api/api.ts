/**
 * api/api.ts — Mock costing API service.
 * Replace the implementations with real axios calls when the backend is ready.
 * All signatures and return shapes are API-ready.
 */
import type { CostingSummary, DocumentCost } from '../types'
import { MOCK_COSTING_SUMMARY, findDocumentById } from '../mock/data'

const SIMULATED_DELAY_MS = 900

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export async function fetchCostingSummary(): Promise<CostingSummary> {
  await delay(SIMULATED_DELAY_MS)
  // TODO: replace with real API call
  // const { data } = await apiClient.get<CostingSummary>('/costing/summary')
  // return data
  return structuredClone(MOCK_COSTING_SUMMARY)
}

export async function fetchDocumentCostDetail(
  documentId: string,
): Promise<DocumentCost> {
  await delay(400)
  // TODO: replace with real API call
  // const { data } = await apiClient.get<DocumentCost>(`/costing/documents/${documentId}`)
  // return data
  const doc = findDocumentById(documentId)
  if (!doc) throw new Error(`Document ${documentId} not found`)
  return structuredClone(doc)
}
