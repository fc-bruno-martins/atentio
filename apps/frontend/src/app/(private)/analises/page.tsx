import { AnalysesPage } from '@/features/analyses'
import { RoleGate } from '@/features/shared'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ conversa?: string }>
}) {
  const { conversa } = await searchParams
  return (
    <RoleGate role={['company_admin', 'user']}>
      <AnalysesPage initialConversationId={conversa} />
    </RoleGate>
  )
}
