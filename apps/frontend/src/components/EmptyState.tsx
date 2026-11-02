'use client'

/**
 * Standard "nothing here" block for list/empty states.
 *
 *   - `card`  (default) — padded bordered box, for list pages
 *   - `inline`          — minimal, for inside columns / tight spaces
 */
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  action?: ReactNode
  variant?: 'card' | 'inline'
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
  variant = 'card',
  className,
}: EmptyStateProps) {
  if (variant === 'inline') {
    return (
      <div className={cn('text-center py-10 text-muted-foreground', className)}>
        {Icon && (
          <Icon className="h-10 w-10 mx-auto mb-2 text-primary-ink/25" />
        )}
        <p className="text-sm font-medium text-foreground">{title}</p>
        {subtitle && <p className="text-xs mt-1">{subtitle}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card p-12 text-center',
        className
      )}
    >
      {Icon && <Icon className="h-10 w-10 text-primary-ink/30" />}
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}
