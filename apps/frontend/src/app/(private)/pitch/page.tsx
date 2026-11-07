import { PitchPage } from '@/features/business'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role={['platform_admin', 'company_admin', 'user']}>
      <PitchPage />
    </RoleGate>
  )
}
