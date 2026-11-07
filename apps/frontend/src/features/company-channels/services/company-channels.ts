import { apiFetch, apiSend } from '@/lib/api'
import type { Connection } from '@/features/shared'

export interface CompanyConnection extends Connection {
  owner_id: string
  owner_name: string
}

const BASE = '/api/v1/company-connections'

export const fetchCompanyConnections = () => apiFetch<CompanyConnection[]>(BASE)

export const disconnectCompanyConnection = (id: string) =>
  apiSend<CompanyConnection>(`${BASE}/${id}/disconnect`, 'POST')
