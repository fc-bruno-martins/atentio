'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  Brain,
  Bug,
  Check,
  Code2,
  Database,
  LayoutList,
  RotateCcw,
  ScanSearch,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AiOrb } from '@/components/ui/ai-processing'
import { Button } from '@/components/ui/button'
import { periodRange } from '@/features/conversations'
import { useModelName } from '@/features/shared'
import { launchWordFlight } from '@/lib/motion'
import { cn } from '@/lib/utils'
import {
  fetchAnalysis,
  startAnalysis,
  type AgentName,
  type AgentStep,
  type Analysis,
} from '../services/analyses'
import { AnalysisResult } from './analysis-result'
import { HarnessDebug } from './harness-debug'
import { PublisherPanel } from './publisher-panel'
import { messagesQuery, scopedMessages, type Draft } from './studio-draft'

const POLL_MS = 700

interface AgentInfo {
  title: string
  role: string
  icon: LucideIcon
  color: string
}

const AGENTS: Record<AgentName, AgentInfo> = {
  coletor: {
    title: 'Coletor',
    role: 'Busca as mensagens do recorte e resume quem falou e quando.',
    icon: Database,
    color: '#22d3ee',
  },
  extrator: {
    title: 'Extrator',
    role: 'Lê a conversa e levanta fatos: assuntos, pedidos, compromissos, decisões e datas.',
    icon: ScanSearch,
    color: '#8b5cf6',
  },
  analista: {
    title: 'Analista',
    role: 'Responde à sua pergunta com os fatos do extrator e a conversa.',
    icon: Brain,
    color: '#25e2af',
  },
  estruturador: {
    title: 'Estruturador',
    role: 'Organiza a resposta em seções e conta pendências e decisões.',
    icon: LayoutList,
    color: '#f59e0b',
  },
  publicador: {
    title: 'Publicador',
    role: 'Depois da revisão humana, publica nos conectores de saída via MCP.',
    icon: Send,
    color: '#ec4899',
  },
}

const ORDER: AgentName[] = ['coletor', 'extrator', 'analista', 'estruturador']

const THOUGHTS: Record<AgentName, string[]> = {
  coletor: ['Buscando mensagens'],
  extrator: ['Lendo a conversa', 'Separando pedidos e compromissos', 'Anotando datas e decisões'],
  analista: ['Cruzando fatos e conversa', 'Pensando na sua pergunta', 'Escrevendo a resposta'],
  estruturador: ['Organizando seções'],
  publicador: ['Aguardando revisão humana'],
}

const INPUT_LABELS: Record<string, string> = {
  conversa: 'Conversa',
  recorte: 'Mensagens no recorte',
  mensagens: 'Mensagens',
  caracteres: 'Caracteres',
  pergunta: 'Pergunta',
  fatos: 'Fatos do extrator',
  palavras: 'Palavras',
}

function seconds(step: AgentStep, now: number): string | null {
  if (!step.started_at) return null
  const end = step.finished_at ? new Date(step.finished_at).getTime() : now
  return `${Math.max(0, (end - new Date(step.started_at).getTime()) / 1000).toFixed(1)}s`
}

function show(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'sim' : 'não'
  if (typeof value === 'string') return value.length > 80 ? `${value.slice(0, 79)}…` : value
  return String(value)
}

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  )
}

function Output({ step }: { step: AgentStep }) {
  const out = step.output
  if (step.status === 'failed') {
    return (
      <p role="alert" className="text-sm text-destructive">
        {show(out.erro ?? 'Falhou')}
      </p>
    )
  }
  if (step.status !== 'done') return <p className="text-xs text-muted-foreground">Aguardando…</p>

  if (step.agent === 'coletor') {
    const people = list(out.participantes) as { nome: string; mensagens: number }[]
    const max = Math.max(1, ...people.map((p) => p.mensagens))
    return (
      <div className="flex flex-col gap-2">
        <p className="font-mono text-2xl font-semibold tabular-nums">
          {show(out.mensagens)} <span className="text-xs text-muted-foreground">mensagens</span>
        </p>
        <ul className="flex flex-col gap-1">
          {people.slice(0, 4).map((person) => (
            <li key={person.nome} className="fx-enter flex items-center gap-2 text-xs">
              <span className="w-20 truncate">{person.nome}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-[#22d3ee]"
                  style={{ width: `${(person.mensagens / max) * 100}%` }}
                />
              </span>
              <span className="font-mono text-muted-foreground">{person.mensagens}</span>
            </li>
          ))}
        </ul>
        {Number(out.midias) > 0 && (
          <p className="text-xs text-muted-foreground">{show(out.midias)} mídias sem texto</p>
        )}
      </div>
    )
  }

  if (step.agent === 'extrator') {
    const counts = (out.contagem ?? {}) as Record<string, number>
    const facts = (out.fatos ?? {}) as Record<string, unknown>
    const topics = list(facts.assuntos) as string[]
    const requests = list(facts.pedidos) as { quem?: string; o_que?: string }[]
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1">
          {Object.entries(counts).map(([key, value]) => (
            <span
              key={key}
              className="fx-enter rounded-full border border-[#8b5cf6]/40 bg-[#8b5cf6]/10 px-2 py-0.5 text-[11px]"
            >
              {value} {key}
            </span>
          ))}
        </div>
        {topics.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Assuntos: <span className="text-foreground">{topics.slice(0, 4).join(', ')}</span>
          </p>
        )}
        {requests.slice(0, 3).map((request, index) => (
          <p key={index} className="fx-enter truncate text-xs">
            <span className="font-semibold text-[#a78bfa]">{request.quem ?? '—'}:</span>{' '}
            {request.o_que}
          </p>
        ))}
        {'bruto' in out && <p className="text-xs text-muted-foreground">Resposta fora do formato.</p>}
      </div>
    )
  }

  if (step.agent === 'analista') {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="font-mono text-2xl font-semibold tabular-nums">
          {show(out.palavras)} <span className="text-xs text-muted-foreground">palavras</span>
        </p>
        <p className="line-clamp-3 text-xs text-muted-foreground">{show(out.resposta)}</p>
      </div>
    )
  }

  const sections = list(out.secoes) as { titulo: string; itens: number }[]
  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-1">
        {sections.map((section) => (
          <li
            key={section.titulo}
            className="fx-enter flex items-center gap-2 rounded-md border border-[#f59e0b]/30 bg-[#f59e0b]/5 px-2 py-1 text-xs"
          >
            <Check className="size-3 text-[#f59e0b]" aria-hidden />
            <span className="flex-1 truncate">{section.titulo}</span>
            <span className="font-mono text-muted-foreground">{section.itens}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {show(out.pendencias)} pendências · {show(out.decisoes)} decisões
      </p>
    </div>
  )
}

function AgentCard({
  step,
  now,
  orbRef,
  children,
}: {
  step: AgentStep
  now: number
  orbRef?: React.Ref<HTMLDivElement>
  children?: ReactNode
}) {
  const info = AGENTS[step.agent]
  const running = step.status === 'running'
  const thoughts = THOUGHTS[step.agent]
  const thought = thoughts[Math.floor(now / 1800) % thoughts.length]
  const inputs = Object.entries(step.input).filter(([key]) => key !== 'conversa')
  const modelName = useModelName()
  return (
    <section
      aria-label={info.title}
      data-status={step.status}
      className={cn(
        'relative flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border bg-card p-4 transition-all duration-500',
        running && 'shadow-[0_0_40px_-12px_var(--agent)]',
        step.status === 'pending' && 'opacity-50',
        step.status === 'failed' && 'border-destructive/60',
      )}
      style={{ '--agent': info.color, borderColor: running || step.status === 'done' ? `${info.color}88` : undefined } as React.CSSProperties}
    >
      <header className="flex items-center gap-3">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl border-2 transition-all',
            running && 'fx-node-active',
          )}
          style={{ borderColor: info.color, color: step.status === 'done' ? '#04120d' : info.color, background: step.status === 'done' ? info.color : undefined }}
        >
          {step.status === 'done' ? <Check className="size-5" aria-hidden /> : <info.icon className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Agente ·{' '}
            {running ? 'trabalhando' : step.status === 'done' ? 'concluído' : step.status === 'failed' ? 'falhou' : 'aguardando'}
          </p>
          <h3 className="text-lg font-semibold">{info.title}</h3>
        </div>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{seconds(step, now)}</span>
      </header>
      <p className="text-xs text-muted-foreground">{info.role}</p>

      <Block title="Entrada">
        {inputs.length === 0 ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            {inputs.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">{INPUT_LABELS[key] ?? key}</dt>
                <dd className="truncate font-medium">{show(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Block>

      <Block title="Processamento">
        <div className="flex items-center gap-2 text-xs">
          {step.model ? (
            <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono">
              {modelName(step.model)}
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono">
              <Code2 className="size-3" aria-hidden /> código
            </span>
          )}
          {running && <span className="fx-neon-text font-medium">{thought}…</span>}
        </div>
        {running && step.model && (
          <div className="flex justify-center py-1">
            <AiOrb ref={orbRef} size={64} />
          </div>
        )}
        {children}
      </Block>

      <Block title="Saída">
        <Output step={step} />
      </Block>
    </section>
  )
}

/** O que passa de um agente para o próximo. */
function handoff(from: AgentStep | undefined): string {
  const out = from?.output ?? {}
  if (!from || from.status !== 'done') return ''
  if (from.agent === 'coletor') return `${show(out.mensagens)} mensagens`
  if (from.agent === 'extrator') {
    const counts = Object.values((out.contagem ?? {}) as Record<string, number>)
    return `${counts.reduce((sum, value) => sum + value, 0)} fatos`
  }
  if (from.agent === 'analista') return `${show(out.palavras)} palavras`
  return ''
}

function Connector({ from, to }: { from?: AgentStep; to?: AgentStep }) {
  const flowing = to?.status === 'running'
  const passed = from?.status === 'done' || from?.status === 'failed'
  return (
    <div className="flex shrink-0 items-center justify-center xl:w-16 xl:flex-col" aria-hidden>
      <div className="relative h-6 w-0.5 overflow-hidden rounded-full bg-border xl:h-0.5 xl:w-full">
        {passed && <span className="absolute inset-0 bg-primary/60" />}
        {flowing && <span className="fx-flow absolute inset-0 hidden xl:block" />}
        {flowing && <span className="fx-flow-v absolute inset-0 xl:hidden" />}
      </div>
      <span className="ml-2 flex items-center gap-1 text-center font-mono text-[10px] text-muted-foreground xl:mt-1 xl:ml-0">
        {handoff(from)}
        <ArrowRight className="size-3 rotate-90 xl:rotate-0" />
      </span>
    </div>
  )
}

/** Etapa 4: os agentes trabalham em sequência; cada um mostra entrada, processamento e saída. */
export function RunStep({ draft, onRestart }: { draft: Draft; onRestart: () => void }) {
  const queryClient = useQueryClient()
  const messages = useQuery(messagesQuery(draft))
  const scoped = useMemo(
    () => scopedMessages(draft, messages.data?.messages ?? []),
    [draft, messages.data],
  )
  const start = useMutation({
    mutationFn: () =>
      startAnalysis({
        conversation_id: draft.conversation?.id ?? '',
        preset: draft.preset || undefined,
        ...(draft.promptId ? { prompt_id: draft.promptId } : { prompt_text: draft.text }),
        ...(draft.scope === 'selection'
          ? { message_ids: draft.selectedIds }
          : draft.scope === 'period'
            ? periodRange(draft.period)
            : {}),
      }),
  })
  const { mutate } = start
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    mutate()
  }, [mutate])

  const id = start.data?.id
  const live = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => fetchAnalysis(id ?? ''),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === 'done' || query.state.data?.status === 'failed' ? false : POLL_MS),
  })
  const analysis: Analysis | undefined = live.data ?? start.data
  const finished = analysis?.status === 'done' || analysis?.status === 'failed'
  useEffect(() => {
    if (finished) void queryClient.invalidateQueries({ queryKey: ['analyses'] })
  }, [finished, queryClient])

  // Relógio para os tempos ao vivo; para quando a análise termina.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (finished || !analysis) return
    const timer = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(timer)
  }, [finished, analysis])

  const steps = ORDER.map(
    (agent) =>
      analysis?.steps?.find((step) => step.agent === agent) ??
      ({ agent, status: 'pending', model: null, input: {}, output: {}, started_at: null, finished_at: null } as AgentStep),
  )
  const thinking = steps.find((step) => step.status === 'running' && step.model)

  // Palavras saem da amostra de mensagens e voam até o agente que está pensando.
  const sampleRef = useRef<HTMLUListElement>(null)
  const orbRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!thinking || !sampleRef.current || !orbRef.current) return
    const sources = [...sampleRef.current.querySelectorAll<HTMLElement>('[data-message-text]')]
    return launchWordFlight({ sources, target: orbRef.current, intervalMs: 120 })
  }, [thinking])

  const sample = scoped.slice(-5)
  const [view, setView] = useState<'agents' | 'debug'>('agents')

  if (start.isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p role="alert" className="text-destructive">
          {start.error.message}
        </p>
        <Button onClick={onRestart}>
          <RotateCcw className="size-4" aria-hidden /> Começar de novo
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Visualização da execução" className="flex w-fit rounded-lg border border-border bg-muted p-1">
        {(
          [
            ['agents', 'Agentes', Users],
            ['debug', 'Debug do harness', Bug],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              view === id
                ? 'bg-primary text-primary-foreground shadow-[0_0_16px_-4px_var(--neon-1)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {view === 'debug' && analysis && <HarnessDebug analysis={analysis} />}

      <div className={cn('flex flex-col xl:flex-row xl:items-stretch', view !== 'agents' && 'hidden')}>
        {steps.map((step, index) => (
          <div key={step.agent} className="contents">
            {index > 0 && <Connector from={steps[index - 1]} to={step} />}
            <AgentCard step={step} now={now} orbRef={thinking?.agent === step.agent ? orbRef : undefined}>
              {step.agent === 'coletor' && step.status === 'done' && (
                <ul ref={sampleRef} className="flex flex-col gap-1">
                  {sample.map((message) => (
                    <li
                      key={message.id}
                      data-message-text
                      className="fx-in-left truncate rounded-md bg-muted px-2 py-1 text-[11px]"
                    >
                      <span className="font-semibold text-[#22d3ee]">
                        {message.from_me ? 'Eu' : (message.sender_name ?? 'Contato')}:
                      </span>{' '}
                      {message.text ?? 'mídia'}
                    </li>
                  ))}
                </ul>
              )}
            </AgentCard>
          </div>
        ))}
      </div>

      {analysis?.status === 'failed' && (
        <div className="flex justify-center">
          <Button
            onClick={() => {
              start.reset()
              mutate()
            }}
          >
            <RotateCcw className="size-4" aria-hidden /> Tentar de novo
          </Button>
        </div>
      )}

      {analysis?.status === 'done' && analysis.result && (
        <AnalysisResult
          analysis={analysis}
          durationMs={
            analysis.steps?.[0]?.started_at && analysis.steps[3]?.finished_at
              ? new Date(analysis.steps[3].finished_at).getTime() -
                new Date(analysis.steps[0].started_at).getTime()
              : undefined
          }
          onReset={onRestart}
          large
          className="p-6 lg:p-8"
        />
      )}
      {analysis?.status === 'done' && <PublisherPanel analysis={analysis} />}
    </div>
  )
}
