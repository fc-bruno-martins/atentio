import { apiFetch } from '@/lib/api'

export type ComponentName =
  | 'backend'
  | 'database'
  | 'queue'
  | 'evolution_api'
  | 'workers'
  | 'mcp'

export interface PlatformStatus {
  healthy: boolean
  schema_version: string | null
  checked_at: string
  components: { component: ComponentName; available: boolean; detail: string | null }[]
}

export const fetchStatus = () => apiFetch<PlatformStatus>('/api/v1/platform/status')
