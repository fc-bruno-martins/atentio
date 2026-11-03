import { AnalysesPage } from '@/features/analyses'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role={['company_admin', 'user']}>
      <AnalysesPage />
    </RoleGate>
  )
}
