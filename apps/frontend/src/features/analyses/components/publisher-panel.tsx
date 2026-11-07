'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  Check,
  ChevronDown,
  FlaskConical,
  Plus,
  Send,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  ConnectOutputDialog,
  outputLook,
  useOutputConnections,
  useOutputConnectors,
  type OutputConnector,
} from '@/features/shared'
import { cn } from '@/lib/utils'
import { publishAnalysis, type AgentStep, type Analysis, type PublishItem } from '../services/analyses'

interface Proposal {
  resumo?: string
  itens?: { titulo: string; responsavel?: string | null; prazo?: string | null }[]
}

interface Delivery {
  conector: string
  nome: string
  ferramenta: string
  argumentos: Record<string, unknown>
  status: string
  referencia: string | null
  mensagem: string | null
  workspace?: string
  item?: Record<string, unknown>
}

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value))

/** Como o item ficou no destino, no visual de cada ferramenta (simulado). */
function ItemCard({ delivery }: { delivery: Delivery }) {
  const item = delivery.item ?? {}
  const look = outputLook(delivery.conector)
  const meta = [
    item.responsavel ? `👤 ${text(item.responsavel)}` : null,
    item.prazo ? `📅 ${text(item.prazo)}` : null,
  ].filter(Boolean)

  if (delivery.conector === 'notion') {
    const blocks = (item.blocos as string[] | undefined) ?? []
    return (
      <div className="rounded-lg border border-border bg-[#191919] p-3 text-[#e6e6e6]">
        <p className="mb-1 text-[10px] text-[#9b9b9b]">{text(item.banco)}</p>
        <p className="mb-2 text-base font-bold">📄 {text(item.titulo)}</p>
        <ul className="flex flex-col gap-0.5 text-xs">
          {blocks.slice(0, 6).map((block, index) => (
            <li key={index} className="truncate">
              {block.startsWith('- [ ]') ? `☐ ${block.slice(6)}` : block}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  const styles: Record<string, string> = {
    jira: 'border-l-4 border-l-[#2684FF]',
    clickup: 'border-l-4 border-l-[#7B68EE]',
    azure_devops: 'border-l-4 border-l-[#0078D4]',
  }
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-lg border border-border bg-background/60 p-3', styles[delivery.conector])}>
      <div className="flex items-center gap-2 text-xs">
        <look.icon className="size-4" />
        <span className="font-mono font-semibold" style={{ color: look.color }}>
          {text(item.chave)}
        </span>
        {item.tipo !== undefined && <span className="text-muted-foreground">{text(item.tipo)}</span>}
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">{text(item.estado)}</span>
      </div>
      <p className="text-sm font-medium">{text(item.titulo)}</p>
      <p className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {meta.map((value) => (
          <span key={value}>{value}</span>
        ))}
        {item.lista !== undefined && <span>📋 {text(item.lista)}</span>}
        {item.projeto !== undefined && <span>📁 {text(item.projeto)}</span>}
        {item.area !== undefined && <span>🗂 {text(item.area)}</span>}
      </p>
    </div>
  )
}

function Review({ analysis, step, onDone }: { analysis: Analysis; step: AgentStep; onDone: (a: Analysis) => void }) {
  const notify = useToast()
  const outputs = useOutputConnectors()
  const proposal = (step.output.proposta ?? {}) as Proposal
  const [summary, setSummary] = useState(proposal.resumo ?? '')
  const [items, setItems] = useState<PublishItem[]>(
    (proposal.itens ?? []).map((item) => ({ title: item.titulo, owner: item.responsavel, due: item.prazo })),
  )
  const [destinations, setDestinations] = useState<string[]>([])
  const { connections } = useOutputConnections()
  const [connecting, setConnecting] = useState<OutputConnector | null>(null)
  const decide = useMutation({
    mutationFn: (approve: boolean) =>
      publishAnalysis(
        analysis.id,
        approve
          ? { approve, destinations, summary, items: items.filter((item) => item.title.trim()) }
          : { approve },
      ),
    onSuccess: (updated, approve) => {
      notify(approve ? 'Aprovado. O agente publicador entregou nos conectores de saída.' : 'Proposta descartada.')
      onDone(updated)
    },
  })
  const toggle = (id: string) =>
    setDestinations((current) => (current.includes(id) ? current.filter((d) => d !== id) : [...current, id]))
  const change = (index: number, field: keyof PublishItem, value: string) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value || null } : item)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm">
        <UserCheck className="size-4 text-amber-400" aria-hidden />
        <span>
          <strong>Revisão humana.</strong> O agente publicador só envia depois da sua aprovação. Edite o que
          quiser antes.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="publish-summary" className="text-sm font-medium">
            Resumo para o cliente
          </label>
          <Textarea id="publish-summary" value={summary} onChange={(event) => setSummary(event.target.value)} className="min-h-28" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Pendências ({items.length})</p>
          <ul className="flex flex-col gap-1.5">
            {items.map((item, index) => (
              <li key={index} className="fx-enter grid grid-cols-[1fr_110px_90px_auto] gap-1.5">
                <Input aria-label={`Pendência ${index + 1}`} value={item.title} onChange={(e) => change(index, 'title', e.target.value)} className="h-8" />
                <Input aria-label={`Responsável ${index + 1}`} placeholder="Responsável" value={item.owner ?? ''} onChange={(e) => change(index, 'owner', e.target.value)} className="h-8" />
                <Input aria-label={`Prazo ${index + 1}`} placeholder="Prazo" value={item.due ?? ''} onChange={(e) => change(index, 'due', e.target.value)} className="h-8" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Remover pendência ${index + 1}`}
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => setItems((current) => [...current, { title: '' }])}>
            <Plus className="size-4" aria-hidden /> Adicionar pendência
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Publicar em</p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Conectores de saída">
          {outputs.data?.map((output) => {
            const look = outputLook(output.id)
            const blocked = output.status === 'blocked'
            const active = destinations.includes(output.id)
            return (
              <button
                key={output.id}
                type="button"
                disabled={blocked}
                aria-pressed={active}
                title={output.note ?? output.action}
                onClick={() => (connections[output.id] ? toggle(output.id) : setConnecting(output))}
                className={cn(
                  'flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition-all',
                  blocked && 'cursor-not-allowed opacity-50',
                  active ? 'border-primary bg-primary/10 shadow-[0_0_18px_-6px_var(--neon-1)]' : 'border-border hover:border-primary/40',
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white">
                  <look.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{output.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {blocked
                      ? 'bloqueado'
                      : connections[output.id]
                        ? `conectado · ${connections[output.id]!.workspace}`
                        : 'clique para conectar'}
                  </span>
                </span>
                {active && <Check className="size-4 text-primary-ink" aria-hidden />}
                {blocked && <Ban className="size-4 text-muted-foreground" aria-hidden />}
              </button>
            )
          })}
        </div>
      </div>

      {connecting && (
        <ConnectOutputDialog
          output={connecting}
          onClose={() => setConnecting(null)}
          onConnected={() => toggle(connecting.id)}
        />
      )}
      <FormError message={decide.error?.message ?? outputs.error?.message} />
      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={decide.isPending || destinations.length === 0} onClick={() => decide.mutate(true)}>
          <Send className="size-4" aria-hidden /> Aprovar e publicar
        </Button>
        <Button size="lg" variant="ghost" disabled={decide.isPending} onClick={() => decide.mutate(false)}>
          <X className="size-4" aria-hidden /> Descartar
        </Button>
      </div>
    </div>
  )
}

function Deliveries({ step }: { step: AgentStep }) {
  const deliveries = (step.output.entregas ?? []) as Delivery[]
  const [open, setOpen] = useState<number | null>(null)
  if (deliveries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma entrega: não havia pendências para publicar.</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {deliveries.map((delivery, index) => {
        const look = outputLook(delivery.conector)
        return (
          <li key={index} className="fx-enter rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setOpen(open === index ? null : index)}
              aria-expanded={open === index}
              className="flex w-full items-center gap-3 p-2.5 text-left text-sm"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white">
                <look.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {delivery.nome} · {delivery.workspace ?? 'destino de exemplo'}
                </span>
                <span className="block font-mono text-[10px] text-muted-foreground">
                  tools/call {delivery.ferramenta} · {delivery.referencia}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                <FlaskConical className="size-3" aria-hidden /> {delivery.status}
              </span>
              <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open === index && 'rotate-180')} aria-hidden />
            </button>
            <div className="px-2.5 pb-2.5">
              <ItemCard delivery={delivery} />
            </div>
            {open === index && (
              <pre className="m-2.5 mt-0 overflow-auto rounded-md bg-[#05080c] p-2.5 font-mono text-[11px] whitespace-pre-wrap text-slate-300">
                {JSON.stringify(
                  { jsonrpc: '2.0', method: 'tools/call', params: { name: delivery.ferramenta, arguments: delivery.argumentos } },
                  null,
                  2,
                )}
              </pre>
            )}
          </li>
        )
      })}
      <p className="text-xs text-muted-foreground">{deliveries[0]?.mensagem}</p>
    </ul>
  )
}

/**
 * Último agente: propõe o que levar adiante, espera a revisão humana e publica
 * nos conectores de saída via MCP.
 */
export function PublisherPanel({ analysis }: { analysis: Analysis }) {
  const queryClient = useQueryClient()
  const step = analysis.steps?.find((item) => item.agent === 'publicador')
  if (!step || step.status === 'pending') return null

  const update = (updated: Analysis) => {
    queryClient.setQueryData(['analysis', updated.id], updated)
    void queryClient.invalidateQueries({ queryKey: ['analyses'] })
  }

  return (
    <section
      aria-label="Publicador"
      data-status={step.status}
      className={cn(
        'fx-enter flex flex-col gap-4 rounded-2xl border bg-card p-5',
        step.status === 'waiting' ? 'border-amber-400/60 shadow-[0_0_40px_-14px_#fbbf24]' : 'border-[#ec4899]/50',
      )}
    >
      <header className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl border-2 border-[#ec4899] text-[#ec4899]">
          <Send className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Agente ·{' '}
            {step.status === 'waiting' ? 'aguardando revisão humana' : step.status === 'skipped' ? 'descartado' : 'publicado'}
          </p>
          <h3 className="text-lg font-semibold">Publicador</h3>
        </div>
        <p className="ml-auto max-w-sm text-right text-xs text-muted-foreground">
          Leva resumo e pendências aos conectores de saída por MCP (tools/call).
        </p>
      </header>
      {step.status === 'waiting' && <Review analysis={analysis} step={step} onDone={update} />}
      {step.status === 'done' && <Deliveries step={step} />}
      {step.status === 'skipped' && <p className="text-sm text-muted-foreground">A proposta foi descartada na revisão humana.</p>}
    </section>
  )
}
