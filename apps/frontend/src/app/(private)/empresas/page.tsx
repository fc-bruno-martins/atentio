import { CompaniesPage } from '@/features/companies'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role="platform_admin">
      <CompaniesPage />
    </RoleGate>
  )
}
