'use client'

/**
 * Dialog — a small, dependency-free centered modal primitive.
 *
 * Mirrors the overlay/modal chrome used by the board's TaskDrawer (dark overlay
 * + centered card, close on Escape and on overlay click) so modals across the
 * portal stay visually consistent without pulling in a new library.
 *
 *   <Dialog open={open} onClose={close} title="Novo usuário" footer={…}>
 *     …form…
 *   </Dialog>
 *
 * Renders nothing when `open` is false. Body scroll is locked while open. The
 * `footer` slot is optional and lives below a divider (typically Cancel /
 * Confirm buttons).
 */
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Optional action row rendered below a divider (e.g. Cancelar / Criar). */
  footer?: React.ReactNode
  className?: string
  /**
   * Tailwind z-index class for the overlay/wrapper. Defaults to `z-50`. The
   * global confirm dialog raises this (e.g. `z-[200]`) so it always sits above
   * other modals it may be triggered from (TaskDrawer, image lightbox, …).
   */
  zIndexClassName?: string
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  zIndexClassName = 'z-50',
}: DialogProps) {
  // Close on Escape + lock body scroll while the dialog is mounted/open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center p-4',
        zIndexClassName
      )}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        aria-hidden
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fx-pop relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-2xl dark:border-primary/25 dark:shadow-[0_0_60px_-20px_rgb(37_226_175/0.5)]',
          className
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="truncate text-base font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
