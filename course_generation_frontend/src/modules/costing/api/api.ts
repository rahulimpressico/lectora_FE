/**
 * api/api.ts — Costing API service.
 */
import type { CostingSummary, DocumentCost } from '../types'
import apiClient from '@/api/client'

export async function fetchCostingSummary(): Promise<CostingSummary> {
  const { data } = await apiClient.get<CostingSummary>('/costing/summary')
  return data
}

export async function fetchDocumentCostDetail(
  documentId: string,
): Promise<DocumentCost> {
  const { data } = await apiClient.get<DocumentCost>(`/costing/documents/${documentId}`)
  return data
}
