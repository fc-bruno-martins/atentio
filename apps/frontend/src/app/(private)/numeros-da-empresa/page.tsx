import { CompanyNumbersPage } from '@/features/company-numbers'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role="company_admin">
      <CompanyNumbersPage />
    </RoleGate>
  )
}
