'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { FormError } from '@/components/ui/field'
import {
  cancelConnection,
  fetchConnection,
  startConnection,
  type ConnectionAttempt,
} from '../services/numbers'

const POLL_INTERVAL_MS = 3_000

const FAILURES: Record<NonNullable<ConnectionAttempt['failure']>, string> = {
  number_in_use: 'Este número já está conectado a outra conta.',
  limit_reached: 'Você já tem 2 números conectados. Desconecte um para conectar outro.',
}

function failureMessage(attempt: ConnectionAttempt | undefined): string | undefined {
  if (attempt?.status === 'expired') return 'O QR code expirou. Gere outro para continuar.'
  if (attempt?.status === 'rejected' && attempt.failure) return FAILURES[attempt.failure]
  return undefined
}

function QrCode({ attempt }: { attempt: ConnectionAttempt }) {
  if (!attempt.qr_code) {
    return <p className="text-sm text-muted-foreground">Gerando o QR code…</p>
  }
  return (
    <>
      {/* QR em data URL: não passa pelo otimizador de imagens. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={attempt.qr_code} alt="QR code para conectar o WhatsApp" className="size-64" />
      <ol className="list-decimal pl-5 text-sm text-muted-foreground">
        <li>Abra o WhatsApp no celular.</li>
        <li>Toque em Aparelhos conectados e depois em Conectar um aparelho.</li>
        <li>Aponte a câmera para o QR code.</li>
      </ol>
    </>
  )
}

function Notice() {
  return (
    <div className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p>
        Esta conexão não é oficial e pode resultar em banimento do número. O acesso é somente
        leitura: a plataforma não envia mensagens nem marca conversas como lidas.
      </p>
    </div>
  )
}

export function ConnectDialog({
  onClose,
  onConnected,
}: {
  onClose: () => void
  onConnected: () => void
}) {
  const [started, setStarted] = useState<ConnectionAttempt | null>(null)
  const start = useMutation({ mutationFn: startConnection, onSuccess: setStarted })
  const { data } = useQuery({
    queryKey: ['connection', started?.id],
    queryFn: () => fetchConnection(started?.id ?? ''),
    enabled: started !== null,
    gcTime: 0,
    refetchInterval: (query) =>
      (query.state.data ?? started)?.status === 'pending' ? POLL_INTERVAL_MS : false,
  })

  const attempt = data ?? started ?? undefined
  const pending = attempt?.status === 'pending'
  const connected = attempt?.status === 'connected'

  useEffect(() => {
    if (connected) onConnected()
  }, [connected, onConnected])

  const close = () => {
    if (started && pending) void cancelConnection(started.id).catch(() => undefined)
    onClose()
  }

  return (
    <Dialog open onClose={close} title="Conectar número">
      <div className="flex flex-col gap-4">
        <Notice />
        {attempt && pending && <QrCode attempt={attempt} />}
        <FormError message={failureMessage(attempt) ?? start.error?.message} />
        {!pending && (
          <Button onClick={() => start.mutate()} disabled={start.isPending}>
            {attempt ? 'Gerar outro QR code' : 'Gerar QR code'}
          </Button>
        )}
      </div>
    </Dialog>
  )
}
