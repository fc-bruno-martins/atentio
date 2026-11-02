import { apiSend } from '@/lib/api'
import type { CurrentUser } from '@/features/shared'

export const updateName = (name: string) => apiSend<CurrentUser>('/api/v1/me', 'PATCH', { name })

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiSend<void>('/api/v1/me/password', 'PUT', {
    current_password: currentPassword,
    new_password: newPassword,
  })
