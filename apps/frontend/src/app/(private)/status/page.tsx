import { StatusPage } from '@/features/platform-status'
import { RoleGate } from '@/features/shared'

export default function Page() {
  return (
    <RoleGate role="platform_admin">
      <StatusPage />
    </RoleGate>
  )
}
