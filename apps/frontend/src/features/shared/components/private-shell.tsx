'use client'

import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useCurrentUser } from '../hooks/use-current-user'
import { menuFor } from '../services/nav'
import { logout } from '../services/session'

const ROLE_LABELS = {
  platform_admin: 'Administrador da plataforma',
  company_admin: 'Admin da empresa',
  user: 'Usuário',
}

export function PrivateShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data: user, error, isPending } = useCurrentUser()

  useEffect(() => {
    if (error && 'status' in error && error.status === 401) window.location.assign('/login')
  }, [error])

  if (isPending) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
  if (!user) {
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        Não foi possível carregar sua conta. Tente novamente em instantes.
      </p>
    )
  }

  const handleLogout = async () => {
    await logout().catch(() => undefined)
    queryClient.clear()
    window.location.assign('/login')
  }

  return (
    <AppShell
      items={menuFor(user.role)}
      activeHref={pathname}
      userName={user.name}
      subtitle={user.company?.name ?? ROLE_LABELS[user.role]}
      onLogout={() => void handleLogout()}
      renderLink={(item, className, children) => (
        <Link href={item.href} className={className}>
          {children}
        </Link>
      )}
    >
      {children}
    </AppShell>
  )
}
