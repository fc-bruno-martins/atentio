export type Role = 'platform_admin' | 'company_admin' | 'user'

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: Role
  company: { id: string; name: string } | null
}
