import { CompanyChannelsPage } from '@/features/company-channels'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role="company_admin">
      <CompanyChannelsPage />
    </RoleGate>
  )
}
