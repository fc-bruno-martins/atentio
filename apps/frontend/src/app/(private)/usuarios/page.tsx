import { UsersPage } from '@/features/users'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role="company_admin">
      <UsersPage />
    </RoleGate>
  )
}
