import { apiFetch, apiSend } from '@/lib/api'
import type { CurrentUser } from '../types'

export const fetchCurrentUser = () => apiFetch<CurrentUser>('/api/v1/me')
export const logout = () => apiSend<void>('/api/v1/auth/logout', 'POST')
