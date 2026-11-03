'use client'

import type { ReactNode } from 'react'
import { useCurrentUser } from '../hooks/use-current-user'
import type { Role } from '../types'

/** Só melhora a experiência: quem garante o acesso é a API. */
export function RoleGate({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const { data: user } = useCurrentUser()
  if (!user) return null
  if (![role].flat().includes(user.role)) {
    return <p role="alert">Você não tem permissão para acessar esta página.</p>
  }
  return children
}
