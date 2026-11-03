'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCw, Smartphone, Unplug } from 'lucide-react'
import { useCallback, useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FormError } from '@/components/ui/field'
import {
  formatDate,
  formatPhone,
  NumberStatus,
  REASON_LABELS,
  type WhatsAppNumber,
} from '@/features/shared'
import { disconnectNumber, fetchNumbers } from '../services/numbers'
import { ConnectDialog } from './connect-dialog'

const QUERY_KEY = ['numbers']
const POLL_INTERVAL_MS = 30_000

function DisconnectDialog({
  number,
  onClose,
  onDone,
}: {
  number: WhatsAppNumber
  onClose: () => void
  onDone: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => disconnectNumber(number.id),
    onSuccess: onDone,
  })
  return (
    <Dialog open onClose={onClose} title="Desconectar número">
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          Desconectar {formatPhone(number.phone)}? Para voltar, será preciso ler um novo QR code.
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

function NumberRow({
  number,
  onReconnect,
  onDisconnect,
}: {
  number: WhatsAppNumber
  onReconnect: () => void
  onDisconnect: () => void
}) {
  const connected = number.status === 'connected'
  const reason = number.disconnect_reason && REASON_LABELS[number.disconnect_reason]
  return (
    <li className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="font-medium">{formatPhone(number.phone)}</p>
        <p className="text-sm text-muted-foreground">
          Atualizado em {formatDate(number.status_changed_at)}
        </p>
        {reason && <p className="text-sm text-muted-foreground">{reason}</p>}
      </div>
      <div className="flex items-center gap-2">
        <NumberStatus number={number} />
        {connected ? (
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

export function NumbersPage() {
  const queryClient = useQueryClient()
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState<WhatsAppNumber | null>(null)
  const { data, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchNumbers,
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
        title="Números"
        subtitle="Números de WhatsApp conectados à sua conta, em modo somente leitura."
        icon={Smartphone}
        actions={
          <Button onClick={() => setConnecting(true)}>
            <Plus className="size-4" aria-hidden />
            Conectar número
          </Button>
        }
      />
      <FormError message={error?.message} />
      {data?.length === 0 && (
        <EmptyState
          icon={Smartphone}
          title="Nenhum número conectado"
          subtitle="Conecte seu WhatsApp lendo um QR code."
        />
      )}
      {data && data.length > 0 && (
        <Card>
          <ul className="divide-y divide-border">
            {data.map((number) => (
              <NumberRow
                key={number.id}
                number={number}
                onReconnect={() => setConnecting(true)}
                onDisconnect={() => setDisconnecting(number)}
              />
            ))}
          </ul>
        </Card>
      )}
      {connecting && <ConnectDialog onClose={() => setConnecting(false)} onConnected={refresh} />}
      {disconnecting && (
        <DisconnectDialog
          number={disconnecting}
          onClose={() => setDisconnecting(null)}
          onDone={refresh}
        />
      )}
    </div>
  )
}
