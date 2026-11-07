import { BrainPage } from '@/features/brain'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role={['company_admin', 'user']}>
      <BrainPage />
    </RoleGate>
  )
}
