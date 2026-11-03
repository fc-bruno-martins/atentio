import { PromptsPage } from '@/features/analyses'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role={['company_admin', 'user']}>
      <PromptsPage />
    </RoleGate>
  )
}
