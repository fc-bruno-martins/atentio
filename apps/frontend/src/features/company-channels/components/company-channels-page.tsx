'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cable, PlugZap, Unplug, Users } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FormError } from '@/components/ui/field'
import { Initials } from '@/components/ui/initials'
import { Stat } from '@/components/ui/stat'
import { useToast } from '@/components/ui/toast'
import { ConnectionStatus, ConnectorBadge, formatAccount, formatDate } from '@/features/shared'
import {
  disconnectCompanyConnection,
  fetchCompanyConnections,
  type CompanyConnection,
} from '../services/company-channels'

const QUERY_KEY = ['company-connections']
const POLL_INTERVAL_MS = 30_000

function ConfirmDialog({ connection, onClose }: { connection: CompanyConnection; onClose: () => void }) {
  const queryClient = useQueryClient()
  const notify = useToast()
  const mutation = useMutation({
    mutationFn: () => disconnectCompanyConnection(connection.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      notify('Conta desconectada.')
      onClose()
    },
  })
  return (
    <Dialog open onClose={onClose} title="Desconectar conta">
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          Desconectar {formatAccount(connection)}, de {connection.owner_name}? A pessoa verá que foi
          desconectado pelo admin e precisará conectar de novo.
        </p>
        <FormError message={mutation.error?.message} />
        <Button
          variant="destructive"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          Confirmar desconexão
        </Button>
      </div>
    </Dialog>
  )
}

export function CompanyChannelsPage() {
  const [disconnecting, setDisconnecting] = useState<CompanyConnection | null>(null)
  const { data, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchCompanyConnections,
    refetchInterval: POLL_INTERVAL_MS,
  })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader
        title="Conectores da empresa"
        subtitle="Contas conectadas por pessoa, em cada conector. Conversas e mensagens não ficam aqui."
        icon={Cable}
      />
      <FormError message={error?.message} />
      {data && data.length > 0 && (
        <div className="fx-stagger grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Contas" value={data.length} icon={Cable} />
          <Stat
            label="Capturando agora"
            value={data.filter((c) => c.status === 'connected').length}
            icon={PlugZap}
          />
          <Stat label="Pessoas" value={new Set(data.map((c) => c.owner_id)).size} icon={Users} />
        </div>
      )}
      {data?.length === 0 && (
        <EmptyState icon={Cable} title="Nenhuma conta conectada na empresa" />
      )}
      {data && data.length > 0 && (
        <Card>
          <ul className="fx-stagger divide-y divide-border">
            {data.map((connection) => (
              <li
                key={connection.id}
                className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-muted/50"
              >
                <Initials name={connection.owner_name} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{connection.owner_name}</p>
                  <p className="text-sm text-muted-foreground">
                    <ConnectorBadge channel={connection.channel} className="mr-1.5 align-middle" />
                    {formatAccount(connection)} ·{' '}
                    {formatDate(connection.status_changed_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ConnectionStatus connection={connection} />
                  {connection.status === 'connected' && (
                    <Button variant="outline" size="sm" onClick={() => setDisconnecting(connection)}>
                      <Unplug className="size-4" aria-hidden />
                      Desconectar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {disconnecting && (
        <ConfirmDialog connection={disconnecting} onClose={() => setDisconnecting(null)} />
      )}
    </div>
  )
}
