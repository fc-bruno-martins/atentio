'use client'

import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Minimize2,
  MonitorPlay,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { Fragment, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { AtentioMark } from '@/components/brand/AtentioMark'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import { Backdrop } from './Backdrop'
import { useMenuArrows, usePresentation } from './presentation'

export interface NavItem {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** Desenha uma linha antes do item, separando grupos do menu. */
  separatorBefore?: boolean
}

interface AppShellProps {
  items: NavItem[]
  activeHref: string
  userName: string
  subtitle: string
  onLogout: () => void
  renderLink: (item: NavItem, className: string, children: ReactNode) => ReactNode
  /** Navega para um item do menu; habilita o modo telão, em que as setas trocam de tela. */
  onNavigate?: (item: NavItem) => void
  /** Ações extras no topo, à esquerda do nome (ex.: botão da paleta de comandos). */
  headerActions?: ReactNode
  children: ReactNode
}

/**
 * Controles do telão, no rodapé da barra lateral recolhida (fora da área da tela): o mouse faz o
 * mesmo que as setas, e mostra onde se está.
 */
function PresentationBar({
  items,
  index,
  onNavigate,
  onExit,
}: {
  items: NavItem[]
  index: number
  onNavigate: (item: NavItem) => void
  onExit: () => void
}) {
  const previous = items[index - 1]
  const next = items[index + 1]
  return (
    <div
      role="toolbar"
      aria-label="Controles do telão"
      aria-orientation="vertical"
      className="flex flex-col items-center gap-1"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={previous ? `Anterior: ${previous.label}` : 'Anterior'}
        title={previous ? `Anterior: ${previous.label} (←)` : undefined}
        disabled={!previous}
        onClick={() => previous && onNavigate(previous)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span
        className="font-mono text-[10px] text-muted-foreground tabular-nums"
        title={items[index]?.label}
      >
        {index + 1}/{items.length}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={next ? `Próximo: ${next.label}` : 'Próximo'}
        title={next ? `Próximo: ${next.label} (→)` : undefined}
        disabled={!next}
        onClick={() => next && onNavigate(next)}
      >
        <ChevronRight className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Sair do telão" title="Sair do telão (Esc)" onClick={onExit}>
        <Minimize2 className="size-4" />
      </Button>
    </div>
  )
}

/** Passa a posição do mouse para o card sob ele, que desenha um brilho no ponto. */
function useCardSpotlight() {
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const card = (event.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-slot="card"]')
      if (!card) return
      const rect = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`)
      card.style.setProperty('--my', `${event.clientY - rect.top}px`)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
}

const COLLAPSED_KEY = 'atentio:menu-collapsed'

/** Menu recolhível; a escolha fica guardada no navegador. */
function useCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.localStorage?.getItem(COLLAPSED_KEY) === '1',
  )
  const toggle = () =>
    setCollapsed((value) => {
      window.localStorage?.setItem(COLLAPSED_KEY, value ? '0' : '1')
      return !value
    })
  return [collapsed, toggle]
}

/** Casca adaptada de Sidebar e Header do DS; não depende de framework nem de negócio. */
export function AppShell({
  items,
  activeHref,
  userName,
  subtitle,
  onLogout,
  renderLink,
  onNavigate,
  headerActions,
  children,
}: AppShellProps) {
  useCardSpotlight()
  const [collapsed, toggleCollapsed] = useCollapsed()
  const [presenting, togglePresentation] = usePresentation()
  const activeIndex = items.findIndex((item) => activeHref.startsWith(item.href))
  const navigate = onNavigate ?? (() => undefined)
  useMenuArrows(presenting && Boolean(onNavigate), items, activeIndex, navigate)
  // No telão a barra fica recolhida, sem mudar a preferência guardada.
  const compact = collapsed || presenting
  const label = compact ? 'hidden' : 'hidden md:inline'
  return (
    <div data-presenting={presenting} className="relative flex min-h-screen bg-canvas">
      <Backdrop />
      <aside
        data-collapsed={compact}
        className={cn(
          'sticky top-0 z-10 flex h-screen w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-xl transition-[width] duration-300',
          !compact && 'md:w-60',
        )}
      >
        <div className="flex h-14 items-center gap-2 px-5">
          <AtentioMark animated className="h-5 w-auto shrink-0 drop-shadow-[0_0_8px_rgb(37_226_175/0.6)]" />
          <span className={cn('fx-neon-text text-base font-semibold', label)}>Atentio</span>
        </div>
        <nav aria-label="Menu principal" className="fx-stagger flex flex-col gap-1 p-2">
          {items.map((item) => {
            const active = activeHref.startsWith(item.href)
            const className = cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-200',
              active
                ? 'fx-nav-active bg-sidebar-primary text-sidebar-primary-foreground'
                : 'hover:translate-x-0.5 hover:bg-sidebar-hover hover:text-foreground',
            )
            return (
              <Fragment key={item.href}>
                {item.separatorBefore && <Separator className="my-1.5 bg-sidebar-border" />}
                <div title={compact ? item.label : undefined} aria-current={active ? 'page' : undefined}>
                  {renderLink(
                    item,
                    className,
                    <>
                      <item.icon className="size-4 shrink-0" />
                      <span className={cn('truncate', label)}>{item.label}</span>
                    </>,
                  )}
                </div>
              </Fragment>
            )
          })}
        </nav>
        {presenting && onNavigate && (
          <div className="mt-auto border-t border-sidebar-border p-2">
            <PresentationBar
              items={items}
              index={activeIndex}
              onNavigate={onNavigate}
              onExit={togglePresentation}
            />
          </div>
        )}
        <div hidden={presenting} className="mt-auto flex flex-col gap-1 p-2">
          <div
            className="flex items-center gap-2.5 px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase"
            title="Captura ao vivo"
          >
            <span className="fx-live-dot shrink-0" aria-hidden />
            <span className={cn('truncate', label)}>Captura ao vivo</span>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="hidden items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground md:flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" />
            ) : (
              <PanelLeftClose className="size-4 shrink-0" />
            )}
            <span className={label}>Recolher menu</span>
          </button>
        </div>
      </aside>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header
          hidden={presenting}
          className="sticky top-0 z-20 flex h-14 items-center justify-end gap-3 border-b border-border bg-background/60 px-4 backdrop-blur-xl"
        >
          {headerActions}
          {onNavigate && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Modo telão"
              title="Modo telão (T): tela cheia, ← e → trocam de tela, Esc sai"
              onClick={togglePresentation}
            >
              <MonitorPlay className="size-4" />
            </Button>
          )}
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label="Sair" onClick={onLogout}>
            <LogOut className="size-4" />
          </Button>
        </header>
        <main key={activeHref} className={cn('fx-enter flex-1 p-4 md:p-6', presenting && 'md:p-10')}>
          {children}
        </main>
      </div>
    </div>
  )
}
