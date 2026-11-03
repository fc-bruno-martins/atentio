import { ConversationsPage } from '@/features/conversations'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role={['company_admin', 'user']}>
      <ConversationsPage />
    </RoleGate>
  )
}
