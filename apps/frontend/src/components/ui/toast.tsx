'use client'

import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'error'
interface Toast {
  id: number
  text: string
  tone: Tone
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => undefined)

/** Avisos rápidos no canto da tela, que somem sozinhos. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), [])
  const notify = useCallback(
    (text: string, tone: Tone = 'success') => {
      const id = Date.now() + Math.random()
      setToasts((all) => [...all.slice(-3), { id, text, tone }])
      setTimeout(() => dismiss(id), 3500)
    },
    [dismiss],
  )
  const value = useMemo(() => notify, [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[120] flex w-80 flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'fx-toast pointer-events-auto flex items-center gap-2 rounded-lg border bg-popover/90 px-3 py-2.5 text-sm shadow-lg backdrop-blur-xl',
              toast.tone === 'success'
                ? 'border-primary/40 shadow-[0_0_30px_-10px_var(--neon-1)]'
                : 'border-destructive/50',
            )}
          >
            {toast.tone === 'success' ? (
              <CircleCheck className="size-4 shrink-0 text-primary-ink" aria-hidden />
            ) : (
              <CircleAlert className="size-4 shrink-0 text-destructive" aria-hidden />
            )}
            <span className="flex-1">{toast.text}</span>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => dismiss(toast.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
