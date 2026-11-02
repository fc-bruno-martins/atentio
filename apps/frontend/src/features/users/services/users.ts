import { apiFetch, apiSend } from '@/lib/api'
import type { Role } from '@/features/shared'

export type CompanyRole = Exclude<Role, 'platform_admin'>

export interface CompanyUser {
  id: string
  name: string
  email: string
  role: CompanyRole
  is_active: boolean
}

export interface PendingInvitation {
  id: string
  email: string
  role: CompanyRole
  expires_at: string
  email_failed: boolean
}

export const fetchUsers = () => apiFetch<CompanyUser[]>('/api/v1/users')

export const updateUser = (
  id: string,
  changes: Partial<Pick<CompanyUser, 'role' | 'is_active'>>,
) => apiSend<CompanyUser>(`/api/v1/users/${id}`, 'PATCH', changes)

export const fetchInvitations = () =>
  apiFetch<PendingInvitation[]>('/api/v1/company-invitations')

export const createInvitation = (email: string, role: CompanyRole) =>
  apiSend<PendingInvitation>('/api/v1/company-invitations', 'POST', { email, role })

export const resendInvitation = (id: string) =>
  apiSend<PendingInvitation>(`/api/v1/company-invitations/${id}/resend`, 'POST')

export const cancelInvitation = (id: string) =>
  apiSend<void>(`/api/v1/company-invitations/${id}`, 'DELETE')
