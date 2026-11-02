'use client'

import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { fetchStatus, type ComponentName } from '../services/status'

const POLL_INTERVAL_MS = 10_000

const LABELS: Record<ComponentName, string> = {
  backend: 'Backend',
  database: 'Banco de dados',
  queue: 'Fila',
  evolution_api: 'Evolution API',
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
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader
        title="Status"
        subtitle={data && (data.healthy ? 'Tudo disponível' : 'Há componentes indisponíveis')}
        icon={Activity}
      />
      {isPending && <p className="text-sm text-muted-foreground">Consultando…</p>}
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível consultar o estado da plataforma.
        </p>
      )}
      {data && (
        <Card>
          <ul className="divide-y divide-border">
            {data.components.map((item) => (
              <li key={item.component} className="flex flex-wrap items-center gap-2 p-3">
                <span
                  aria-hidden
                  className={cn(
                    'size-2 rounded-full',
                    item.available ? 'bg-success' : 'bg-destructive',
                  )}
                />
                <strong className="flex-1 text-sm font-medium">{LABELS[item.component]}</strong>
                <span className="text-sm">{item.available ? 'Disponível' : 'Indisponível'}</span>
                {item.detail && (
                  <small className="w-full text-muted-foreground">{item.detail}</small>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {data && (
        <p className="text-sm text-muted-foreground">
          Versão do esquema: {data.schema_version ?? 'indisponível'}
        </p>
      )}
    </div>
  )
}
