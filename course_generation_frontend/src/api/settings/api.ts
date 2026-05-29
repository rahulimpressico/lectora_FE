/**
 * api/settings/api.ts
 *
 * Agent model configuration settings.
 * Manages deployment overrides and resets for pipeline agents.
 */
import apiClient from '@/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentModelConfig {
  agent_id: string
  name: string
  role: string
  pipeline_step: number
  default_deployment: string
  current_deployment: string
  is_overridden: boolean
  supports_temperature: boolean
}

export interface AvailableModel {
  id: string
  label: string
  provider: string
  tier: string
}

export interface SettingsResponse {
  agents: AgentModelConfig[]
  available_models: AvailableModel[]
}

export interface ModelUpdate {
  agent_id: string
  deployment: string
}

export interface UpdateModelsResponse {
  status: string
  message: string
  agents: AgentModelConfig[]
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const settingsApi = {
  /** Fetch current agent model configs + available models list. */
  getSettings: (): Promise<SettingsResponse> =>
    apiClient.get('/settings').then((r) => r.data as SettingsResponse),

  /** Persist deployment overrides for one or more agents. */
  updateModels: (updates: ModelUpdate[]): Promise<UpdateModelsResponse> =>
    apiClient
      .put('/settings/models', { updates })
      .then((r) => r.data as UpdateModelsResponse),

  /** Revert one or all agents to their default deployments. */
  resetModels: (agentId?: string): Promise<UpdateModelsResponse> =>
    apiClient
      .post('/settings/models/reset', agentId ? { agent_id: agentId } : {})
      .then((r) => r.data as UpdateModelsResponse),
}
