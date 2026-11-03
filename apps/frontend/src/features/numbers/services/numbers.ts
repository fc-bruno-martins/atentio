import { apiFetch, apiSend } from '@/lib/api'
import type { WhatsAppNumber } from '@/features/shared'

export interface ConnectionAttempt {
  id: string
  status: 'pending' | 'connected' | 'rejected' | 'expired' | 'cancelled'
  qr_code: string | null
  failure: 'number_in_use' | 'limit_reached' | null
  expires_at: string
}

const BASE = '/api/v1/numbers'

export const fetchNumbers = () => apiFetch<WhatsAppNumber[]>(BASE)

export const startConnection = () => apiSend<ConnectionAttempt>(`${BASE}/connections`, 'POST')

export const fetchConnection = (id: string) =>
  apiFetch<ConnectionAttempt>(`${BASE}/connections/${id}`)

export const cancelConnection = (id: string) =>
  apiSend<void>(`${BASE}/connections/${id}`, 'DELETE')

export const disconnectNumber = (id: string) =>
  apiSend<WhatsAppNumber>(`${BASE}/${id}/disconnect`, 'POST')
