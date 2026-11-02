import { apiSend } from '@/lib/api'
import type { CurrentUser } from '@/features/shared'

export const login = (email: string, password: string) =>
  apiSend<{ user: CurrentUser }>('/api/v1/auth/login', 'POST', { email, password })

export const requestRecovery = (email: string) =>
  apiSend<void>('/api/v1/auth/password-recovery', 'POST', { email })

export const resetPassword = (token: string, password: string) =>
  apiSend<void>('/api/v1/auth/password-reset', 'POST', { token, password })
