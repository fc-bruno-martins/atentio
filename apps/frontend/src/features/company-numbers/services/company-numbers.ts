import { apiFetch, apiSend } from '@/lib/api'
import type { WhatsAppNumber } from '@/features/shared'

export interface CompanyNumber extends WhatsAppNumber {
  owner_id: string
  owner_name: string
}

const BASE = '/api/v1/company-numbers'

export const fetchCompanyNumbers = () => apiFetch<CompanyNumber[]>(BASE)

export const disconnectCompanyNumber = (id: string) =>
  apiSend<CompanyNumber>(`${BASE}/${id}/disconnect`, 'POST')
