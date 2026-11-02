import { apiFetch, apiSend } from '@/lib/api'

export interface Company {
  id: string
  name: string
  is_active: boolean
}

export interface CreatedCompany extends Company {
  invitation_email_failed: boolean
}

export const fetchCompanies = () => apiFetch<Company[]>('/api/v1/companies')

export const createCompany = (name: string, adminEmail: string) =>
  apiSend<CreatedCompany>('/api/v1/companies', 'POST', { name, admin_email: adminEmail })

export const updateCompany = (id: string, changes: Partial<Pick<Company, 'name' | 'is_active'>>) =>
  apiSend<Company>(`/api/v1/companies/${id}`, 'PATCH', changes)
