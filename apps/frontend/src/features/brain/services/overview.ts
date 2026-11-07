import { apiFetch } from '@/lib/api'

export interface Overview {
  total_messages: number
  last_24h: number
  from_me: number
  people: number
  by_day: { day: string; messages: number }[]
  conversations: { conversation_id: string; messages: number; last_24h: number }[]
}

export function fetchOverview(): Promise<Overview> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return apiFetch<Overview>(`/api/v1/overview?tz=${encodeURIComponent(tz)}`)
}
