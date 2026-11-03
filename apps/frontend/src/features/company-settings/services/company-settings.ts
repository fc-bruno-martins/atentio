import { apiFetch, apiSend } from '@/lib/api'

interface CompanySettings {
  retention_days: number
}

const BASE = '/api/v1/company-settings'

export const fetchCompanySettings = () => apiFetch<CompanySettings>(BASE)
export const saveRetention = (retention_days: number) =>
  apiSend<CompanySettings>(BASE, 'PUT', { retention_days })
