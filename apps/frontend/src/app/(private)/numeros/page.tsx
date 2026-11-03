import { NumbersPage } from '@/features/numbers'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role={['company_admin', 'user']}>
      <NumbersPage />
    </RoleGate>
  )
}
