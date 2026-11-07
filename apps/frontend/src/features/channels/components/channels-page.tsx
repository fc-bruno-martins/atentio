'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cable, Plus, RotateCw, Unplug } from 'lucide-react'
import { useCallback, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FormError } from '@/components/ui/field'
import {
  ConnectionStatus,
  formatAccount,
  formatDate,
  REASON_LABELS,
  type Connection,
} from '@/features/shared'
import {
  disconnectConnection,
  fetchChannels,
  fetchConnections,
  type Channel,
} from '../services/channels'
import { ConnectDialog } from './connect-dialog'

const QUERY_KEY = ['connections']
const POLL_INTERVAL_MS = 30_000

function DisconnectDialog({
  connection,
  onClose,
  onDone,
}: {
  connection: Connection
  onClose: () => void
  onDone: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => disconnectConnection(connection.id),
    onSuccess: onDone,
  })
  return (
    <Dialog open onClose={onClose} title="Desconectar conta">
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          Desconectar {formatAccount(connection)}? A captura desta conta para até você conectar de
          novo.
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

function ConnectionRow({
  connection,
  onReconnect,
  onDisconnect,
}: {
  connection: Connection
  onReconnect: () => void
  onDisconnect: () => void
}) {
  const reason = connection.disconnect_reason && REASON_LABELS[connection.disconnect_reason]
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-medium">{formatAccount(connection)}</p>
        <p className="text-sm text-muted-foreground">
          Atualizado em {formatDate(connection.status_changed_at)}
        </p>
        {reason && <p className="text-sm text-muted-foreground">{reason}</p>}
      </div>
      <div className="flex items-center gap-2">
        <ConnectionStatus connection={connection} />
        {connection.status === 'connected' ? (
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            <Unplug className="size-4" aria-hidden />
            Desconectar
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onReconnect}>
            <RotateCw className="size-4" aria-hidden />
            Reconectar
          </Button>
        )}
      </div>
    </li>
  )
}

function ChannelCard({
  channel,
  connections,
  onConnect,
  onDisconnect,
}: {
  channel: Channel
  connections: Connection[]
  onConnect: () => void
  onDisconnect: (connection: Connection) => void
}) {
  const available = channel.status === 'available'
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">{channel.name}</h2>
        {available ? (
          <Button size="sm" onClick={onConnect}>
            <Plus className="size-4" aria-hidden />
            Conectar {channel.name}
          </Button>
        ) : (
          <Badge variant="secondary">Em breve</Badge>
        )}
      </div>
      {available && connections.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma conta conectada.</p>
      )}
      {connections.length > 0 && (
        <ul className="divide-y divide-border">
          {connections.map((connection) => (
            <ConnectionRow
              key={connection.id}
              connection={connection}
              onReconnect={onConnect}
              onDisconnect={() => onDisconnect(connection)}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

export function ChannelsPage() {
  const queryClient = useQueryClient()
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState<Connection | null>(null)
  const channels = useQuery({ queryKey: ['channels'], queryFn: fetchChannels })
  const connections = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchConnections,
    refetchInterval: POLL_INTERVAL_MS,
  })

  const refresh = useCallback(() => {
    setConnecting(false)
    setDisconnecting(null)
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  }, [queryClient])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader
        title="Canais"
        subtitle="Conecte suas contas. A plataforma só lê: nada é enviado em seu nome."
        icon={Cable}
      />
      <FormError message={channels.error?.message ?? connections.error?.message} />
      {channels.data?.map((channel) => (
        <ChannelCard
          key={channel.id}
          channel={channel}
          connections={(connections.data ?? []).filter((c) => c.channel === channel.id)}
          onConnect={() => setConnecting(true)}
          onDisconnect={setDisconnecting}
        />
      ))}
      {connecting && <ConnectDialog onClose={() => setConnecting(false)} onConnected={refresh} />}
      {disconnecting && (
        <DisconnectDialog
          connection={disconnecting}
          onClose={() => setDisconnecting(null)}
          onDone={refresh}
        />
      )}
    </div>
  )
}
