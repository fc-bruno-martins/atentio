'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowUpFromLine, Ban, Cable, FlaskConical, Plus, RotateCw, Unplug } from 'lucide-react'
import { useCallback, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FormError } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  channelLook,
  ConnectionStatus,
  ConnectOutputDialog,
  outputLook,
  useOutputConnections,
  useOutputConnectors,
  type OutputConnector,
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
    <li className="flex flex-wrap items-center justify-between gap-4 py-3">
      <div>
        <p className="font-mono font-medium">{formatAccount(connection)}</p>
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

function SectionTitle({ icon: Icon, title, text }: { icon: typeof Cable; title: string; text: string }) {
  return (
    <div className="mt-2 flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-ink">
        <Icon className="size-4" aria-hidden />
      </span>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

function OutputConnectors() {
  const { data, error, isPending } = useOutputConnectors()
  const { connections, remove } = useOutputConnections()
  const notify = useToast()
  const [connecting, setConnecting] = useState<OutputConnector | null>(null)
  return (
    <>
      <FormError message={error?.message} />
      <ul className="fx-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Conectores de saída">
        {isPending && [0, 1, 2].map((index) => <li key={index} className="feat-skeleton h-32 rounded-xl" />)}
        {data?.map((output) => {
          const look = outputLook(output.id)
          const blocked = output.status === 'blocked'
          return (
            <li key={output.id}>
              <Card className={cn('flex h-full flex-col gap-3 p-4', blocked && 'opacity-60')}>
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-white"
                    style={{ boxShadow: `0 0 20px -8px ${look.color}` }}
                  >
                    <look.icon className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{output.name}</h3>
                    <p className="font-mono text-[10px] text-muted-foreground">{output.tool}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{output.action}</p>
                {blocked ? (
                  <Badge variant="destructive" className="w-fit gap-1">
                    <Ban className="size-3" aria-hidden /> Bloqueado
                  </Badge>
                ) : connections[output.id] ? (
                  <div className="flex flex-col gap-2">
                    <p className="flex items-center gap-1.5 text-xs">
                      <span className="fx-live-dot !size-1.5" aria-hidden />
                      Conectado · {connections[output.id]!.workspace}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {connections[output.id]!.tools.length} ferramentas MCP · simulação
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-fit"
                      onClick={() => {
                        remove(output.id)
                        notify(`${output.name} desconectado.`)
                      }}
                    >
                      <Unplug className="size-4" aria-hidden /> Desconectar {output.name}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => setConnecting(output)}>
                      <Plus className="size-4" aria-hidden /> Conectar {output.name}
                    </Button>
                    <Badge variant="warning" className="gap-1">
                      <FlaskConical className="size-3" aria-hidden /> Simulação
                    </Badge>
                  </div>
                )}
                {output.note && <p className="text-xs text-muted-foreground">{output.note}</p>}
              </Card>
            </li>
          )
        })}
      </ul>
      {connecting && (
        <ConnectOutputDialog
          output={connecting}
          onClose={() => setConnecting(null)}
          onConnected={() => notify(`${connecting.name} conectado.`)}
        />
      )}
    </>
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
  const look = channelLook(channel.id)
  const live = connections.filter((c) => c.status === 'connected').length
  return (
    <Card className={cn('flex flex-col gap-4 p-5', !available && 'opacity-70')}>
      <div className="flex items-center gap-4">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-white shadow-lg transition-transform duration-300 hover:scale-110 hover:rotate-3"
          style={{ boxShadow: `0 0 24px -8px ${look.color}` }}
        >
          <look.icon className="size-7" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{channel.name}</h2>
          <p className="text-sm text-muted-foreground">{look.description}</p>
          {available && connections.length > 0 && (
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {live > 0 && <span className="fx-live-dot !size-1.5" aria-hidden />}
              {live} de {connections.length} capturando
            </p>
          )}
        </div>
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
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Nenhuma conta conectada.
        </p>
      )}
      {connections.length > 0 && (
        <ul className="fx-stagger divide-y divide-border">
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
  const notify = useToast()
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState<Connection | null>(null)
  const channels = useQuery({ queryKey: ['channels'], queryFn: fetchChannels })
  const connections = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchConnections,
    refetchInterval: POLL_INTERVAL_MS,
  })

  const refresh = useCallback(
    (message: string) => {
      setConnecting(false)
      setDisconnecting(null)
      notify(message)
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    [queryClient, notify],
  )
  const onConnected = useCallback(() => refresh('Conta conectada. A captura já começou.'), [refresh])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Conectores"
        subtitle="De onde a Atentio ouve seus clientes e para onde os agentes levam o que importa."
        icon={Cable}
      />
      <SectionTitle
        icon={ArrowDownToLine}
        title="Conectores de entrada"
        text="Conversas com clientes que a Atentio captura. Somente leitura: nada é enviado, reagido ou marcado como lido."
      />
      <FormError message={channels.error?.message ?? connections.error?.message} />
      {channels.isPending && [0, 1].map((index) => <div key={index} className="feat-skeleton h-28 rounded-xl" />)}
      {channels.data?.map((channel) => (
        <ChannelCard
          key={channel.id}
          channel={channel}
          connections={(connections.data ?? []).filter((c) => c.channel === channel.id)}
          onConnect={() => setConnecting(true)}
          onDisconnect={setDisconnecting}
        />
      ))}
      <SectionTitle
        icon={ArrowUpFromLine}
        title="Conectores de saída"
        text="Para onde o agente publicador leva pendências e resumos, por MCP, depois da sua aprovação."
      />
      <OutputConnectors />
      {connecting && <ConnectDialog onClose={() => setConnecting(false)} onConnected={onConnected} />}
      {disconnecting && (
        <DisconnectDialog
          connection={disconnecting}
          onClose={() => setDisconnecting(null)}
          onDone={() => refresh('Conta desconectada.')}
        />
      )}
    </div>
  )
}
