'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { QrCode as QrIcon, Smartphone, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { FormError } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import {
  cancelConnection,
  fetchConnection,
  startConnection,
  type ConnectionAttempt,
} from '../services/channels'

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
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="feat-skeleton size-56 rounded-xl" />
        <p className="text-sm text-muted-foreground">Gerando o QR code…</p>
      </div>
    )
  }
  return (
    <div className="fx-enter flex flex-col items-center gap-4">
      <div className="relative rounded-2xl bg-white p-3 shadow-[0_0_50px_-12px_var(--neon-1)]">
        {/* QR em data URL: não passa pelo otimizador de imagens. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attempt.qr_code} alt="QR code para conectar o WhatsApp" className="size-60" />
        <span className="fx-qr-line" aria-hidden />
        {['top-0 left-0 border-t-4 border-l-4', 'top-0 right-0 border-t-4 border-r-4', 'bottom-0 left-0 border-b-4 border-l-4', 'right-0 bottom-0 border-r-4 border-b-4'].map(
          (corner) => (
            <span
              key={corner}
              aria-hidden
              className={cn('absolute size-6 rounded-sm border-primary', corner)}
            />
          ),
        )}
      </div>
      <ol className="flex w-full flex-col gap-2 text-sm">
        {[
          'Abra o WhatsApp no celular.',
          'Toque em Aparelhos conectados e depois em Conectar um aparelho.',
          'Aponte a câmera para o QR code.',
        ].map((text, index) => (
          <li key={text} className="flex items-start gap-2 text-muted-foreground">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-[10px] text-primary-ink">
              {index + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="fx-live-dot !size-1.5" aria-hidden />
        Aguardando a leitura do QR code…
      </p>
    </div>
  )
}

const STEPS = [
  { label: 'Aviso', icon: TriangleAlert },
  { label: 'Escanear', icon: QrIcon },
  { label: 'Conectado', icon: Smartphone },
]

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Etapas">
      {STEPS.map((step, index) => (
        <li key={step.label} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-full border transition-all duration-300',
              index < current && 'border-primary bg-primary text-primary-foreground',
              index === current &&
                'border-primary text-primary-ink shadow-[0_0_14px_-2px_var(--neon-1)]',
              index > current && 'border-border text-muted-foreground',
            )}
          >
            <step.icon className="size-3.5" aria-hidden />
          </span>
          <span
            className={cn(
              'text-xs',
              index === current ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {step.label}
          </span>
          {index < STEPS.length - 1 && (
            <span
              aria-hidden
              className={cn(
                'h-px flex-1 transition-colors duration-500',
                index < current ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
        </li>
      ))}
    </ol>
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
    <Dialog open onClose={close} title="Conectar WhatsApp" className="max-w-lg">
      <div className="flex flex-col gap-4">
        <Stepper current={connected ? 2 : pending ? 1 : 0} />
        {!pending && <Notice />}
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
