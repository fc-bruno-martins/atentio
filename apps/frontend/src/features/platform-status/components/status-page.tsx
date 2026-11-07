'use client'

import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { cn } from '@/lib/utils'
import { fetchStatus, type ComponentName } from '../services/status'

const POLL_INTERVAL_MS = 10_000

const LABELS: Record<ComponentName, string> = {
  backend: 'Backend',
  database: 'Banco de dados',
  queue: 'Fila',
  evolution_api: 'Ponte do WhatsApp',
  workers: 'Workers',
  mcp: 'MCP',
}

export function StatusPage() {
  const { data, isError, isPending } = useQuery({
    queryKey: ['platform-status'],
    queryFn: fetchStatus,
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  })

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader
        title="Status"
        subtitle={data && (data.healthy ? 'Tudo disponível' : 'Há componentes indisponíveis')}
        icon={Activity}
      />
      {isPending && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="feat-skeleton h-24 rounded-xl" />
          ))}
          <span className="sr-only">Consultando…</span>
        </div>
      )}
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível consultar o estado da plataforma.
        </p>
      )}
      {data && (
        <ul className="fx-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.components.map((item) => (
            <li
              key={item.component}
              data-slot="card"
              className={cn(
                'flex flex-col gap-2 rounded-xl border bg-card p-4',
                item.available ? 'border-border' : 'border-destructive/50',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    item.available ? 'fx-live-dot' : 'size-2 rounded-full bg-destructive',
                  )}
                />
                <strong className="flex-1 text-sm font-medium">{LABELS[item.component]}</strong>
              </div>
              <span
                className={cn(
                  'font-mono text-xs tracking-widest uppercase',
                  item.available ? 'text-primary-ink' : 'text-destructive',
                )}
              >
                {item.available ? 'Disponível' : 'Indisponível'}
              </span>
              {item.detail && <small className="text-muted-foreground">{item.detail}</small>}
            </li>
          ))}
        </ul>
      )}
      {data && (
        <p className="font-mono text-xs text-muted-foreground">
          Versão do esquema: {data.schema_version ?? 'indisponível'}
        </p>
      )}
    </div>
  )
}
