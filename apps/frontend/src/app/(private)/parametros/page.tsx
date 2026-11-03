import { CompanySettingsPage } from '@/features/company-settings'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role="company_admin">
      <CompanySettingsPage />
    </RoleGate>
  )
}
