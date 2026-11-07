'use client'

/**
 * Standardised page header — title + optional subtitle, icon, and actions
 */
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  /** Texto ou nó (ex.: um Link) — renderizado dentro do <p> do subtítulo. */
  subtitle?: ReactNode
  /** Lucide icon component (uncalled). */
  icon?: ComponentType<{ className?: string }>
  /** Right-aligned slot for primary actions. */
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        {/* Ícone inline e discreto — o chip colorido competia com o conteúdo em
            todas as páginas ao mesmo tempo. */}
        {Icon && (
          <Icon className="mt-1 h-6 w-6 shrink-0 text-primary-ink drop-shadow-[0_0_8px_rgb(37_226_175/0.6)]" />
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <div
            aria-hidden
            className="mt-1.5 h-px w-24 bg-gradient-to-r from-primary via-[var(--neon-2)] to-transparent"
          />
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
