import type { ReactNode } from 'react'
import { PrivateShell } from '@/features/shared'

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return <PrivateShell>{children}</PrivateShell>
}
