'use client'

import { Activity, Bug, Clock, Cpu, Database, Hash, Terminal, UserCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useModelName } from '@/features/shared'
import { cn } from '@/lib/utils'
import type { AgentEvent, AgentName, AgentStep, Analysis } from '../services/analyses'

const ORDER: AgentName[] = ['coletor', 'extrator', 'analista', 'estruturador', 'publicador']
const COLORS: Record<AgentName, string> = {
  coletor: '#22d3ee',
  extrator: '#8b5cf6',
  analista: '#25e2af',
  estruturador: '#f59e0b',
  publicador: '#ec4899',
}
const TITLES: Record<AgentName, string> = {
  coletor: 'Coletor',
  extrator: 'Extrator',
  analista: 'Analista',
  estruturador: 'Estruturador',
  publicador: 'Publicador',
}
const KIND_STYLE: Record<string, string> = {
  start: 'text-sky-400',
  query: 'text-sky-300',
  prompt: 'text-violet-300',
  llm_call: 'text-fuchsia-400',
  llm_response: 'text-emerald-400',
  parse: 'text-emerald-300',
  handoff: 'text-amber-300',
  info: 'text-muted-foreground',
  warning: 'text-amber-500',
  error: 'text-red-400',
  done: 'text-emerald-500',
  proposal: 'text-pink-300',
  waiting: 'text-amber-400',
  review: 'text-amber-300',
  mcp_call: 'text-pink-400',
  mcp_result: 'text-emerald-400',
}

interface LogLine extends AgentEvent {
  agent: AgentName
  offset: number
}

const time = (value: string | null | undefined) => (value ? new Date(value).getTime() : null)

function stepsOf(analysis: Analysis): AgentStep[] {
  return ORDER.map(
    (agent) =>
      analysis.steps?.find((step) => step.agent === agent) ??
      ({ agent, status: 'pending', model: null, input: {}, output: {}, started_at: null, finished_at: null } as AgentStep),
  )
}

// ── Grafo do harness ─────────────────────────────────────────────────────────

const NODES: { id: string; label: string; x: number; y: number; agent?: AgentName; kind: 'io' | 'agent' | 'resource' | 'human' }[] = [
  { id: 'pedido', label: 'Pedido', x: 70, y: 150, kind: 'io' },
  { id: 'coletor', label: 'Coletor', x: 230, y: 150, agent: 'coletor', kind: 'agent' },
  { id: 'banco', label: 'Conectores de entrada', x: 230, y: 275, kind: 'resource' },
  { id: 'extrator', label: 'Extrator', x: 410, y: 150, agent: 'extrator', kind: 'agent' },
  { id: 'ia-extrator', label: 'IA', x: 410, y: 35, kind: 'resource' },
  { id: 'analista', label: 'Analista', x: 590, y: 150, agent: 'analista', kind: 'agent' },
  { id: 'ia-analista', label: 'IA', x: 590, y: 35, kind: 'resource' },
  { id: 'estruturador', label: 'Estruturador', x: 770, y: 150, agent: 'estruturador', kind: 'agent' },
  { id: 'resultado', label: 'Resultado', x: 770, y: 275, kind: 'io' },
  { id: 'humano', label: 'Revisão humana', x: 945, y: 150, kind: 'human' },
  { id: 'publicador', label: 'Publicador', x: 1120, y: 150, agent: 'publicador', kind: 'agent' },
  { id: 'saida', label: 'Conectores de saída (MCP)', x: 1120, y: 275, kind: 'resource' },
]

interface Edge {
  from: string
  to: string
  /** Agente cuja execução "acende" a aresta. */
  active: AgentName
  label?: string
  dashed?: boolean
  bend?: number
}

function GraphView({
  steps,
  status,
  selected,
  onSelect,
}: {
  steps: AgentStep[]
  status: Analysis['status']
  selected: AgentName | null
  onSelect: (agent: AgentName) => void
}) {
  const modelName = useModelName()
  const byAgent = Object.fromEntries(steps.map((step) => [step.agent, step])) as Record<AgentName, AgentStep>
  const handoff = (agent: AgentName) =>
    byAgent[agent].events?.find((event) => event.kind === 'handoff')?.message.split(': ').slice(1).join(': ')
  const edges: Edge[] = [
    { from: 'pedido', to: 'coletor', active: 'coletor', label: 'recorte' },
    { from: 'banco', to: 'coletor', active: 'coletor', label: 'consulta' },
    { from: 'coletor', to: 'extrator', active: 'extrator', label: handoff('coletor') },
    { from: 'extrator', to: 'ia-extrator', active: 'extrator', label: 'prompt ⇄ resposta' },
    { from: 'extrator', to: 'analista', active: 'analista', label: handoff('extrator') },
    { from: 'coletor', to: 'analista', active: 'analista', label: 'conversa', dashed: true, bend: 95 },
    { from: 'analista', to: 'ia-analista', active: 'analista', label: 'prompt ⇄ resposta' },
    { from: 'analista', to: 'estruturador', active: 'estruturador', label: handoff('analista') },
    { from: 'estruturador', to: 'resultado', active: 'estruturador', label: status === 'done' ? 'seções' : undefined },
    { from: 'estruturador', to: 'humano', active: 'publicador', label: 'proposta' },
    { from: 'humano', to: 'publicador', active: 'publicador', label: byAgent.publicador.status === 'done' ? 'aprovado' : undefined },
    { from: 'publicador', to: 'saida', active: 'publicador', label: 'tools/call' },
  ]
  const point = (id: string) => NODES.find((node) => node.id === id)!

  return (
    <svg viewBox="0 0 1210 320" className="w-full" role="img" aria-label="Grafo de execução do harness">
      <defs>
        <marker id="harness-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
        <filter id="harness-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {edges.map((edge) => {
        const a = point(edge.from)
        const b = point(edge.to)
        const step = byAgent[edge.active]
        const live = step.status === 'running' || (step.status === 'waiting' && edge.to === 'humano')
        const done = step.status === 'done' || step.status === 'failed' || step.status === 'skipped'
        const color = COLORS[edge.active]
        const path = edge.bend
          ? `M${a.x},${a.y + 30} Q${(a.x + b.x) / 2},${a.y + edge.bend} ${b.x},${b.y + 30}`
          : `M${a.x},${a.y} L${b.x},${b.y}`
        const mid = edge.bend
          ? { x: (a.x + b.x) / 2, y: a.y + edge.bend / 2 + 32 }
          : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 8 }
        return (
          <g key={`${edge.from}-${edge.to}`} style={{ color: done || live ? color : 'var(--border)' }}>
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth={live ? 2.5 : 1.5}
              strokeOpacity={done || live ? 0.85 : 0.6}
              strokeDasharray={edge.dashed ? '5 5' : undefined}
              markerEnd="url(#harness-arrow)"
            />
            {live &&
              [0, 1, 2].map((n) => (
                <circle key={n} r={3.5} fill={color} filter="url(#harness-glow)">
                  <animateMotion dur="1.2s" begin={`${n * 0.4}s`} repeatCount="indefinite" path={path} />
                </circle>
              ))}
            {edge.label && (
              <text x={mid.x} y={mid.y} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                {edge.label}
              </text>
            )}
          </g>
        )
      })}

      {NODES.map((node) => {
        if (node.kind === 'agent' && node.agent) {
          const step = byAgent[node.agent]
          const color = COLORS[node.agent]
          const running = step.status === 'running'
          const latency = step.metrics?.latencia_ms
          const tokens = (step.metrics?.tokens_entrada ?? 0) + (step.metrics?.tokens_saida ?? 0)
          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`${node.label}: ${step.status}`}
              aria-pressed={selected === node.agent}
              className="cursor-pointer outline-none"
              onClick={() => onSelect(node.agent!)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelect(node.agent!)
              }}
            >
              {running && (
                <rect x={node.x - 70} y={node.y - 32} width={140} height={64} rx={14} fill="none" stroke={color} strokeOpacity={0.5}>
                  <animate attributeName="stroke-width" values="1;8;1" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="1.6s" repeatCount="indefinite" />
                </rect>
              )}
              <rect
                x={node.x - 66}
                y={node.y - 28}
                width={132}
                height={56}
                rx={12}
                fill="var(--card)"
                stroke={step.status === 'failed' ? '#f87171' : step.status === 'pending' ? 'var(--border)' : color}
                strokeWidth={selected === node.agent ? 3 : 2}
                filter={running ? 'url(#harness-glow)' : undefined}
              />
              <text x={node.x} y={node.y - 6} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
                {node.label}
              </text>
              <text x={node.x} y={node.y + 12} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                {step.status === 'pending'
                  ? 'aguardando'
                  : running
                    ? 'executando…'
                    : step.status === 'failed'
                      ? 'falhou'
                      : step.status === 'waiting'
                        ? 'espera aprovação'
                        : step.status === 'skipped'
                          ? 'descartado'
                          : node.agent === 'publicador'
                            ? `${((step.output.entregas as unknown[]) ?? []).length} entregas`
                            : `${latency ?? 0} ms${tokens ? ` · ${tokens} tok` : ''}`}
              </text>
            </g>
          )
        }
        if (node.kind === 'human') {
          const publisher = byAgent.publicador
          const waiting = publisher.status === 'waiting'
          return (
            <g key={node.id}>
              {waiting && (
                <circle cx={node.x} cy={node.y} r={34} fill="none" stroke="#fbbf24" strokeOpacity={0.6}>
                  <animate attributeName="r" values="30;42;30" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.7;0;0.7" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={node.x} cy={node.y} r={30} fill="var(--card)" stroke={waiting || publisher.status === 'done' ? '#fbbf24' : 'var(--border)'} strokeWidth={2} />
              <UserCheck x={node.x - 13} y={node.y - 13} width={26} height={26} color="#fbbf24" aria-hidden />
              <text x={node.x} y={node.y + 48} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
                {node.label}
              </text>
            </g>
          )
        }
        const agent = node.id === 'ia-extrator' ? 'extrator' : node.id === 'ia-analista' ? 'analista' : null
        const label = agent ? modelName(byAgent[agent].model) : node.label
        return (
          <g key={node.id}>
            <rect
              x={node.x - 60}
              y={node.y - 18}
              width={120}
              height={36}
              rx={node.kind === 'io' ? 18 : 8}
              fill="var(--muted)"
              stroke="var(--border)"
              strokeDasharray={node.kind === 'resource' ? '4 3' : undefined}
            />
            <text x={node.x} y={node.y + 4} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Linha do tempo (cascata) ─────────────────────────────────────────────────

function Waterfall({ steps, now }: { steps: AgentStep[]; now: number }) {
  const start = Math.min(...steps.map((s) => time(s.started_at) ?? Infinity))
  const end = Math.max(...steps.map((s) => time(s.finished_at) ?? (s.status === 'running' ? now : 0)), start + 1)
  const span = Number.isFinite(start) ? end - start : 1
  const pct = (value: number) => `${(Math.max(0, value - start) / span) * 100}%`

  return (
    <div className="flex flex-col gap-2">
      {steps.map((step) => {
        const from = time(step.started_at)
        const to = time(step.finished_at) ?? (step.status === 'running' ? now : null)
        const call = time(step.events?.find((e) => e.kind === 'llm_call')?.at)
        const reply = time(step.events?.find((e) => e.kind === 'llm_response')?.at) ?? (call ? to : null)
        return (
          <div key={step.agent} className="grid grid-cols-[96px_1fr_64px] items-center gap-2 text-xs">
            <span className="font-medium" style={{ color: COLORS[step.agent] }}>
              {TITLES[step.agent]}
            </span>
            <div className="relative h-5 rounded bg-muted/60">
              {from !== null && to !== null && Number.isFinite(start) && (
                <span
                  className="absolute inset-y-0 rounded opacity-40"
                  style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})`, background: COLORS[step.agent], minWidth: 3 }}
                />
              )}
              {call !== null && reply !== null && Number.isFinite(start) && (
                <span
                  title="Chamada ao modelo"
                  className="absolute inset-y-1 rounded"
                  style={{ left: pct(call), width: `calc(${pct(reply)} - ${pct(call)})`, background: COLORS[step.agent], minWidth: 3 }}
                />
              )}
            </div>
            <span className="text-right font-mono text-muted-foreground">
              {from !== null && to !== null ? `${((to - from) / 1000).toFixed(2)}s` : '—'}
            </span>
          </div>
        )
      })}
      <p className="text-[10px] text-muted-foreground">Barra clara: etapa inteira · barra forte: chamada ao modelo.</p>
    </div>
  )
}

// ── Console ──────────────────────────────────────────────────────────────────

function Console({ lines, live }: { lines: LogLine[]; live: boolean }) {
  const modelName = useModelName()
  const [filter, setFilter] = useState<AgentName | ''>('')
  const ref = useRef<HTMLOListElement>(null)
  const visible = filter ? lines.filter((line) => line.agent === filter) : lines
  useEffect(() => {
    if (live && ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [visible.length, live])

  const detail = (line: LogLine) =>
    Object.entries(line.data)
      .filter(([key]) => !['system', 'usuario', 'resposta'].includes(key))
      .map(([key, value]) => `${key}=${key === 'modelo' ? modelName(String(value)) : String(value)}`)
      .join(' ')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {(['', ...ORDER] as const).map((agent) => (
          <button
            key={agent || 'todos'}
            type="button"
            aria-pressed={filter === agent}
            onClick={() => setFilter(agent)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
              filter === agent ? 'border-primary bg-primary/15 text-primary-ink' : 'border-border text-muted-foreground',
            )}
          >
            {agent ? TITLES[agent] : 'Todos'}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{visible.length} eventos</span>
      </div>
      <ol
        ref={ref}
        aria-label="Log de eventos dos agentes"
        className="h-72 overflow-y-auto rounded-lg border border-border bg-[#05080c] p-3 font-mono text-[11px] leading-relaxed text-slate-300"
      >
        {visible.length === 0 && <li className="text-muted-foreground">aguardando eventos…</li>}
        {visible.map((line, index) => (
          <li key={`${line.agent}-${line.at}-${index}`} className="fx-in-left flex gap-2 whitespace-pre-wrap">
            <span className="shrink-0 text-slate-500">+{(line.offset / 1000).toFixed(3)}s</span>
            <span className="w-24 shrink-0 font-semibold" style={{ color: COLORS[line.agent] }}>
              [{TITLES[line.agent].toUpperCase()}]
            </span>
            <span className={cn('w-24 shrink-0', KIND_STYLE[line.kind] ?? 'text-slate-400')}>{line.kind}</span>
            <span className="min-w-0">
              {line.message}
              {detail(line) && <span className="text-slate-500"> {detail(line)}</span>}
            </span>
          </li>
        ))}
        {live && <li className="animate-pulse text-primary-ink">▍</li>}
      </ol>
    </div>
  )
}

// ── Inspetor ─────────────────────────────────────────────────────────────────

function Json({ value }: { value: unknown }) {
  return (
    <pre className="max-h-56 overflow-auto rounded-md border border-border bg-[#05080c] p-2.5 font-mono text-[11px] whitespace-pre-wrap text-slate-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function Inspector({ step }: { step: AgentStep }) {
  const modelName = useModelName()
  const prompt = step.events?.find((event) => event.kind === 'prompt')
  const response = step.events?.find((event) => event.kind === 'llm_response')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-base font-semibold" style={{ color: COLORS[step.agent] }}>
          {TITLES[step.agent]}
        </span>
        <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono">{modelName(step.model)}</span>
        {Object.entries(step.metrics ?? {}).map(([key, value]) => (
          <span key={key} className="rounded-md border border-border px-1.5 py-0.5 font-mono text-muted-foreground">
            {key}={value ?? '—'}
          </span>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Entrada</p>
          <Json value={step.input} />
        </div>
        <div>
          <p className="mb-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Saída</p>
          <Json value={step.output} />
        </div>
      </div>
      {prompt && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="mb-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Instruções do agente ({String(prompt.data.caracteres_sistema)} caracteres)
            </p>
            <Json value={prompt.data.system} />
          </div>
          <div>
            <p className="mb-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Mensagem enviada (prévia de {String(prompt.data.caracteres_usuario)} caracteres)
            </p>
            <Json value={prompt.data.usuario} />
          </div>
        </div>
      )}
      {response && (
        <div>
          <p className="mb-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Resposta do modelo (prévia)
          </p>
          <Json value={response.data.resposta} />
        </div>
      )}
    </div>
  )
}

// ── Painel ───────────────────────────────────────────────────────────────────

function Metric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
      <Icon className="size-4 text-primary-ink" aria-hidden />
      <div>
        <p className="font-mono text-sm font-semibold tabular-nums">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/**
 * Debug do harness: grafo de execução, cascata de tempos, log de eventos e inspetor
 * de cada agente. Funciona ao vivo (enquanto roda) e depois, no histórico.
 */
export function HarnessDebug({ analysis }: { analysis: Analysis }) {
  const steps = useMemo(() => stepsOf(analysis), [analysis])
  const live = analysis.status === 'running'
  const [selected, setSelected] = useState<AgentName | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!live) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [live])

  const lines = useMemo(() => {
    const all: LogLine[] = steps.flatMap((step) =>
      (step.events ?? []).map((event) => ({ ...event, agent: step.agent, offset: 0 })),
    )
    const first = Math.min(...all.map((line) => time(line.at) ?? Infinity))
    return all
      .map((line) => ({ ...line, offset: (time(line.at) ?? first) - first }))
      .sort((a, b) => a.offset - b.offset)
  }, [steps])

  const calls = lines.filter((line) => line.kind === 'llm_call').length
  const tokensIn = steps.reduce((sum, step) => sum + (step.metrics?.tokens_entrada ?? 0), 0)
  const tokensOut = steps.reduce((sum, step) => sum + (step.metrics?.tokens_saida ?? 0), 0)
  const firstStart = time(steps[0]?.started_at)
  const lastEnd = time(steps[3]?.finished_at) ?? (live ? now : null)
  const total = firstStart && lastEnd ? ((lastEnd - firstStart) / 1000).toFixed(2) : '—'
  const current =
    steps.find((step) => step.agent === selected) ??
    steps.find((s) => s.status === 'running' || s.status === 'waiting') ??
    steps[0]!

  return (
    <section aria-label="Debug do harness" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Bug className="size-5 text-primary-ink" aria-hidden />
        <h3 className="text-lg font-semibold">Debug do harness</h3>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase',
            live ? 'bg-primary/15 text-primary-ink' : analysis.status === 'failed' ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground',
          )}
        >
          {live ? '● ao vivo' : analysis.status === 'failed' ? 'falhou' : 'concluído'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Metric icon={Clock} label="Tempo total" value={`${total}s`} />
        <Metric icon={Cpu} label="Chamadas à IA" value={String(calls)} />
        <Metric icon={Hash} label="Tokens de entrada" value={tokensIn.toLocaleString('pt-BR')} />
        <Metric icon={Hash} label="Tokens de saída" value={tokensOut.toLocaleString('pt-BR')} />
        <Metric icon={Activity} label="Eventos" value={String(lines.length)} />
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-3">
        <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          <Database className="size-3" aria-hidden /> Grafo de execução · clique num agente para inspecionar
        </p>
        <GraphView steps={steps} status={analysis.status} selected={current.agent} onSelect={setSelected} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <p className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Cascata de tempos</p>
            <Waterfall steps={steps.slice(0, 4)} now={now} />
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              <Terminal className="size-3" aria-hidden /> Log de eventos
            </p>
            <Console lines={lines} live={live} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-3">
          <p className="mb-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Inspetor do agente</p>
          <Inspector step={current} />
        </div>
      </div>
    </section>
  )
}
