'use client'

import { useMutation } from '@tanstack/react-query'
import { Check, KeyRound, Loader2, Plug, Wrench } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { FormError } from '@/components/ui/field'
import { apiSend } from '@/lib/api'
import { cn } from '@/lib/utils'
import { outputLook } from '../services/channel-look'
import type { OutputConnector } from '../services/output-connectors'

export interface McpSession {
  server: string
  workspace: string
  tools: string[]
}

const KEY = 'atentio:output-connections'
const EVENT = 'atentio:output-connections'

type Connections = Record<string, McpSession>
const EMPTY: Connections = {}

function read(): Connections {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage?.getItem(KEY) ?? '{}') as Connections
  } catch {
    return {}
  }
}

let cache: { raw: string | null; value: Connections } = { raw: null, value: {} }
function snapshot(): Connections {
  const raw = typeof window === 'undefined' ? null : (window.localStorage?.getItem(KEY) ?? null)
  if (raw !== cache.raw) cache = { raw, value: read() }
  return cache.value
}

function write(next: Connections) {
  window.localStorage?.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Conexões simuladas com os conectores de saída. Ficam no navegador: é uma
 * demonstração e não guarda credencial nenhuma.
 */
export function useOutputConnections() {
  const connections = useSyncExternalStore<Connections>(
    (notify) => {
      window.addEventListener(EVENT, notify)
      window.addEventListener('storage', notify)
      return () => {
        window.removeEventListener(EVENT, notify)
        window.removeEventListener('storage', notify)
      }
    },
    snapshot,
    () => EMPTY,
  )
  return {
    connections,
    save: (id: string, session: McpSession) => write({ ...read(), [id]: session }),
    remove: (id: string) => {
      const next = read()
      delete next[id]
      write(next)
    },
  }
}

const STEPS = [
  { label: 'Autorizando o acesso (OAuth)', icon: KeyRound },
  { label: 'Handshake MCP: initialize', icon: Plug },
  { label: 'Descobrindo ferramentas: tools/list', icon: Wrench },
]

/** Conexão simulada: autorização, handshake MCP e descoberta das ferramentas do destino. */
export function ConnectOutputDialog({
  output,
  onClose,
  onConnected,
}: {
  output: OutputConnector
  onClose: () => void
  onConnected?: (session: McpSession) => void
}) {
  const { save } = useOutputConnections()
  const look = outputLook(output.id)
  const [stage, setStage] = useState(0)
  const connect = useMutation({
    mutationFn: () => apiSend<McpSession>(`/api/v1/output-connectors/${output.id}/connect`, 'POST'),
  })
  const { mutate } = connect

  // Cada etapa aparece em sequência; a chamada real ao backend acontece no handshake.
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 900),
      setTimeout(() => mutate(), 1000),
      setTimeout(() => setStage(2), 1800),
      setTimeout(() => setStage(3), 2700),
    ]
    return () => timers.forEach(clearTimeout)
  }, [mutate])

  const session = connect.data
  const finished = stage >= 3 && Boolean(session)

  return (
    <Dialog open onClose={onClose} title={`Conectar ${output.name}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl border border-border bg-white" style={{ boxShadow: `0 0 24px -8px ${look.color}` }}>
            <look.icon className="size-7" />
          </span>
          <div>
            <p className="font-semibold">{output.name}</p>
            <p className="text-xs text-muted-foreground">{output.action}</p>
          </div>
        </div>
        <ol className="flex flex-col gap-2">
          {STEPS.map((step, index) => {
            const done = stage > index
            const active = stage === index
            return (
              <li key={step.label} className={cn('flex items-center gap-2 text-sm', !done && !active && 'text-muted-foreground')}>
                <span className={cn('grid size-6 place-items-center rounded-full border', done ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                  {done ? <Check className="size-3.5" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : <step.icon className="size-3.5" />}
                </span>
                {step.label}
              </li>
            )
          })}
        </ol>
        <FormError message={connect.error?.message} />
        {finished && session && (
          <div className="fx-enter flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p>
              Conectado a <strong>{session.workspace}</strong> pelo servidor <span className="font-mono text-xs">{session.server}</span>.
            </p>
            <div className="flex flex-wrap gap-1">
              {session.tools.map((tool) => (
                <span key={tool} className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  {tool}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Simulação: nenhuma credencial é guardada e nada sai da plataforma.</p>
          </div>
        )}
        <Button
          disabled={!finished}
          onClick={() => {
            if (!session) return
            save(output.id, session)
            onConnected?.(session)
            onClose()
          }}
        >
          {finished ? 'Concluir' : 'Conectando…'}
        </Button>
      </div>
    </Dialog>
  )
}
