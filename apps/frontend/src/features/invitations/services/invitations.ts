import { apiSend } from '@/lib/api'

export interface InvitationPreview {
  email: string
  company_name: string
}

export const lookupInvitation = (token: string) =>
  apiSend<InvitationPreview>('/api/v1/invitations/lookup', 'POST', { token })

export const acceptInvitation = (token: string, name: string, password: string) =>
  apiSend<unknown>('/api/v1/invitations/accept', 'POST', { token, name, password })
