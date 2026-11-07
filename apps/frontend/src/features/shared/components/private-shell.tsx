'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Command as CommandIcon, LogOut, SunMoon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { CommandPalette, useCommandShortcut, type Command } from '@/components/ui/command-palette'
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
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const togglePalette = useCallback(() => setPaletteOpen((open) => !open), [])
  useCommandShortcut(togglePalette)
  const { data: user, error, isPending } = useCurrentUser()

  useEffect(() => {
    if (error && 'status' in error && error.status === 401) window.location.assign('/login')
  }, [error])

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-sm text-muted-foreground">
        <span className="fx-live-dot" aria-hidden />
        Carregando…
      </div>
    )
  }
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

  const items = menuFor(user.role)
  const commands: Command[] = [
    ...items.map((item) => ({
      id: item.href,
      label: `Ir para ${item.label}`,
      group: 'Navegar',
      icon: item.icon,
      run: () => router.push(item.href),
    })),
    {
      id: 'theme',
      label: resolvedTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro',
      group: 'Preferências',
      icon: SunMoon,
      run: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
    },
    { id: 'logout', label: 'Sair', group: 'Conta', icon: LogOut, run: () => void handleLogout() },
  ]

  return (
    <AppShell
      items={items}
      activeHref={pathname}
      userName={user.name}
      subtitle={user.company?.name ?? ROLE_LABELS[user.role]}
      onLogout={() => void handleLogout()}
      headerActions={
        <button
          type="button"
          onClick={togglePalette}
          className="mr-auto hidden items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex"
        >
          <CommandIcon className="size-3.5" aria-hidden />
          Ações
          <kbd className="rounded border border-border px-1 font-mono text-[10px]">⌘K</kbd>
        </button>
      }
      onNavigate={(item) => router.push(item.href)}
      renderLink={(item, className, children) => (
        <Link href={item.href} className={className}>
          {children}
        </Link>
      )}
    >
      {children}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} />
    </AppShell>
  )
}
