import { apiFetch, apiSend } from '@/lib/api'
import type { CurrentUser } from '@/features/shared'

export const updateName = (name: string) => apiSend<CurrentUser>('/api/v1/me', 'PATCH', { name })

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiSend<void>('/api/v1/me/password', 'PUT', {
    current_password: currentPassword,
    new_password: newPassword,
  })

export interface McpToken {
  id: string
  name: string
  created_at: string
  last_used_at: string | null
}

export const fetchMcpTokens = () => apiFetch<McpToken[]>('/api/v1/mcp-tokens')
export const createMcpToken = (name: string) =>
  apiSend<McpToken & { token: string }>('/api/v1/mcp-tokens', 'POST', { name })
export const revokeMcpToken = (id: string) => apiSend<void>(`/api/v1/mcp-tokens/${id}`, 'DELETE')
