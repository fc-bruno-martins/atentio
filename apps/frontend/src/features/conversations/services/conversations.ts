import { apiFetch } from '@/lib/api'
import type { Connection } from '@/features/shared'

export interface Conversation {
  id: string
  connection_id: string
  channel: string
  kind: 'direct' | 'group'
  name: string | null
  contact: string
  last_message_at: string
}

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'other'

export interface Message {
  id: string
  from_me: boolean
  sender_name: string | null
  type: MessageType
  text: string | null
  sent_at: string
}

export interface ConversationMessages {
  conversation: Conversation
  messages: Message[]
}

export interface Period {
  from: string
  to: string
}

const BASE = '/api/v1/conversations'

export interface InboxFilter {
  channel: string
  connectionId: string
}

export function fetchConversations({ channel, connectionId }: InboxFilter) {
  const params = new URLSearchParams()
  if (channel) params.set('channel', channel)
  if (connectionId) params.set('connection_id', connectionId)
  const query = params.toString()
  return apiFetch<Conversation[]>(query ? `${BASE}?${query}` : BASE)
}

export const fetchInboxChannels = () =>
  apiFetch<{ id: string; name: string; status: string }[]>('/api/v1/channels')
export const fetchInboxConnections = () => apiFetch<Connection[]>('/api/v1/connections')

/** Datas no fuso da pessoa: o dia final entra inteiro. */
export function periodRange({ from, to }: Period): { since?: string; until?: string } {
  const range: { since?: string; until?: string } = {}
  if (from) range.since = new Date(`${from}T00:00:00`).toISOString()
  if (to) {
    const end = new Date(`${to}T00:00:00`)
    end.setDate(end.getDate() + 1)
    range.until = end.toISOString()
  }
  return range
}

export function periodParams(period: Period): string {
  const query = new URLSearchParams(periodRange(period)).toString()
  return query ? `?${query}` : ''
}

export const fetchMessages = (id: string, period: Period) =>
  apiFetch<ConversationMessages>(`${BASE}/${id}/messages${periodParams(period)}`)
