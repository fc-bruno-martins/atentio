'use client'

import type { ComponentType } from 'react'
import { useCountUp } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** Número de destaque que conta até o valor ao aparecer. */
export function Stat({
  label,
  value,
  icon: Icon,
  suffix,
  compact = false,
  className,
}: {
  label: string
  value: number
  icon?: ComponentType<{ className?: string }>
  suffix?: string
  /** Versão menor, para painéis que precisam caber na tela. */
  compact?: boolean
  className?: string
}) {
  const current = useCountUp(value)
  return (
    <div
      data-slot="card"
      className={cn(
        'flex min-w-0 items-center rounded-xl border border-border bg-card',
        compact ? 'gap-2.5 p-2.5' : 'gap-3 p-3',
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-ink',
            compact ? 'size-8' : 'size-9',
          )}
        >
          <Icon className="size-4" />
        </span>
      )}
      <div className="min-w-0">
        <p
          className={cn(
            'font-mono font-semibold tabular-nums text-foreground',
            compact ? 'text-lg leading-tight' : 'text-xl',
          )}
        >
          {current.toLocaleString('pt-BR')}
          {suffix && <span className="ml-0.5 text-sm text-muted-foreground">{suffix}</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
