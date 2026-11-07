import { apiFetch, apiSend } from '@/lib/api'
import type { Connection } from '@/features/shared'

export interface Channel {
  id: string
  name: string
  status: 'available' | 'coming_soon'
}

export interface ConnectionAttempt {
  id: string
  status: 'pending' | 'connected' | 'rejected' | 'expired' | 'cancelled'
  qr_code: string | null
  failure: 'number_in_use' | 'limit_reached' | null
  expires_at: string
}

const ATTEMPTS = '/api/v1/channels/whatsapp/attempts'

export const fetchChannels = () => apiFetch<Channel[]>('/api/v1/channels')
export const fetchConnections = () => apiFetch<Connection[]>('/api/v1/connections')
export const disconnectConnection = (id: string) =>
  apiSend<Connection>(`/api/v1/connections/${id}/disconnect`, 'POST')

export const startConnection = () => apiSend<ConnectionAttempt>(ATTEMPTS, 'POST')
export const fetchConnection = (id: string) => apiFetch<ConnectionAttempt>(`${ATTEMPTS}/${id}`)
export const cancelConnection = (id: string) => apiSend<void>(`${ATTEMPTS}/${id}`, 'DELETE')
