'use client'

import { CornerDownLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { cn } from '@/lib/utils'

export interface Command {
  id: string
  label: string
  group: string
  icon?: ComponentType<{ className?: string }>
  hint?: string
  run: () => void
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: Command[]
}

/** Abre e fecha a paleta com ⌘K ou Ctrl+K. */
export function useCommandShortcut(onToggle: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onToggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onToggle])
}

/** Paleta de comandos: busca ações e telas pelo teclado. Não conhece regras de negócio. */
export function CommandPalette({ open, ...props }: CommandPaletteProps) {
  // Montar só quando aberta garante busca e seleção zeradas a cada abertura.
  return open ? <PaletteBody {...props} /> : null
}

function PaletteBody({ onOpenChange, commands }: Omit<CommandPaletteProps, 'open'>) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return term ? commands.filter((c) => c.label.toLowerCase().includes(term)) : commands
  }, [commands, query])

  const close = () => onOpenChange(false)
  const runAt = (index: number) => {
    const command = visible[index]
    if (!command) return
    close()
    command.run()
  }
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') close()
    else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, visible.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      runAt(active)
    }
  }

  const groups = [...new Set(visible.map((c) => c.group))]

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[14vh]">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ações"
        onKeyDown={onKeyDown}
        className="fx-pop relative w-full max-w-lg overflow-hidden rounded-xl border border-primary/30 bg-popover text-popover-foreground shadow-[0_0_60px_-15px_rgb(37_226_175/0.5)]"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-primary-ink" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            placeholder="O que você quer fazer?"
            aria-label="Buscar ação"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <ul role="listbox" aria-label="Ações" className="max-h-80 overflow-y-auto p-2">
          {visible.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhuma ação encontrada.
            </li>
          )}
          {groups.map((group) => (
            <li key={group} role="presentation">
              <p className="px-3 pt-2 pb-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {group}
              </p>
              <ul role="presentation">
                {visible.map((command, index) =>
                  command.group !== group ? null : (
                    <li
                      key={command.id}
                      role="option"
                      aria-selected={index === active}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => runAt(index)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        index === active && 'bg-primary/12 text-primary-ink',
                      )}
                    >
                      {command.icon && <command.icon className="size-4 shrink-0" />}
                      <span className="flex-1">{command.label}</span>
                      {command.hint && (
                        <span className="text-xs text-muted-foreground">{command.hint}</span>
                      )}
                      {index === active && <CornerDownLeft className="size-3.5" aria-hidden />}
                    </li>
                  ),
                )}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
