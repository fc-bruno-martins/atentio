'use client'

import { LogOut } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { AtentioMark } from '@/components/brand/AtentioMark'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

export interface NavItem {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

interface AppShellProps {
  items: NavItem[]
  activeHref: string
  userName: string
  subtitle: string
  onLogout: () => void
  renderLink: (item: NavItem, className: string, children: ReactNode) => ReactNode
  children: ReactNode
}

/** Casca adaptada de Sidebar e Header do DS; não depende de framework nem de negócio. */
export function AppShell({
  items,
  activeHref,
  userName,
  subtitle,
  onLogout,
  renderLink,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:w-60">
        <div className="flex h-14 items-center gap-2 px-4">
          <AtentioMark className="h-5 w-auto" />
          <span className="hidden text-base font-semibold text-foreground md:inline">Atentio</span>
        </div>
        <nav aria-label="Menu principal" className="flex flex-col gap-1 p-2">
          {items.map((item) => {
            const active = activeHref.startsWith(item.href)
            const className = cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'hover:bg-sidebar-hover',
            )
            return (
              <div key={item.href}>
                {renderLink(
                  item,
                  className,
                  <>
                    <item.icon className="size-4 shrink-0" />
                    <span className="hidden md:inline">{item.label}</span>
                  </>,
                )}
              </div>
            )
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b border-border bg-background px-4">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label="Sair" onClick={onLogout}>
            <LogOut className="size-4" />
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
