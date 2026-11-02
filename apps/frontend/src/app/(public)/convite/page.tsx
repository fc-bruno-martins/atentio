import { AcceptInvitationForm } from '@/features/invitations'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token = '' } = await searchParams
  return <AcceptInvitationForm token={token} />
}
