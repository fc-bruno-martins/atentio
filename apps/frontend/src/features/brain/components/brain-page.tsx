'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BrainCircuit,
  Cable,
  CheckCheck,
  Clock,
  Gavel,
  ListTodo,
  Maximize2,
  Minimize2,
  MessagesSquare,
  Sparkles,
  Users,
  UsersRound,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormError } from '@/components/ui/field'
import { parseMarkdown } from '@/components/ui/markdown'
import { Stat } from '@/components/ui/stat'
import { fetchAnalyses, type Analysis } from '@/features/analyses'
import {
  fetchConversations,
  fetchInboxConnections,
  type Conversation,
} from '@/features/conversations'
import { channelLabel } from '@/features/shared'
import { useCountUp } from '@/lib/motion'
import { useFullscreen } from '@/lib/use-fullscreen'
import { cn } from '@/lib/utils'
import { fetchOverview, type Overview } from '../services/overview'
import { BrainGraph, type GraphConversation } from './brain-graph'

const POLL_MS = 15_000
const GRAPH_LIMIT = 40
/** Estimativa usada no indicador de tempo poupado; aparece na tela junto com o número. */
const SECONDS_PER_MESSAGE = 8

function title(conversation: Conversation): string {
  if (conversation.name) return conversation.name
  return conversation.kind === 'group' ? 'Grupo sem nome' : `+${conversation.contact}`
}

/** Conta pendências e decisões nas respostas das análises (seções do Markdown). */
export function findings(analyses: Analysis[]) {
  let tasks = 0
  let decisions = 0
  for (const analysis of analyses) {
    let section = ''
    for (const block of parseMarkdown(analysis.result ?? '')) {
      if (block.kind === 'heading') section = block.text.toLowerCase()
      else if (block.kind === 'list') {
        if (section.startsWith('pend')) tasks += block.items.length
        else tasks += block.items.filter((item) => item.task).length
        if (section.startsWith('decis')) decisions += block.items.length
      }
    }
  }
  return { tasks, decisions }
}

function Hero({ overview, savedMinutes }: { overview: Overview; savedMinutes: number }) {
  const total = useCountUp(overview.total_messages, 1400)
  return (
    <Card className="relative flex flex-col justify-center overflow-hidden p-4 xl:row-span-2">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-[var(--neon-3)]/15"
      />
      <p className="relative font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        Mensagens capturadas
      </p>
      <p className="fx-neon-text relative font-mono text-4xl font-bold tabular-nums 2xl:text-5xl">
        {total.toLocaleString('pt-BR')}
      </p>
      <p className="relative mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="fx-live-dot" aria-hidden />+{overview.last_24h.toLocaleString('pt-BR')} nas
        últimas 24 h
      </p>
      <p
        className="relative mt-2 flex items-center gap-2 text-sm"
        title={`Estimativa: ${SECONDS_PER_MESSAGE} s por mensagem lida pela IA`}
      >
        <Clock className="size-4 text-[var(--neon-3)]" aria-hidden />
        <span className="font-mono font-semibold">
          {savedMinutes >= 60 ? `${(savedMinutes / 60).toFixed(1)} h` : `${savedMinutes} min`}
        </span>
        <span className="text-muted-foreground">de leitura poupada*</span>
      </p>
      <p className="relative text-[10px] text-muted-foreground">
        * estimativa de {SECONDS_PER_MESSAGE} s por mensagem lida pela IA
      </p>
    </Card>
  )
}

function WeekChart({ overview }: { overview: Overview }) {
  const days = useMemo(() => {
    const byDay = new Map(overview.by_day.map((d) => [d.day, d.messages]))
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      return {
        key,
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        value: byDay.get(key) ?? 0,
      }
    })
  }, [overview.by_day])
  const max = Math.max(1, ...days.map((d) => d.value))
  return (
    <Card className="flex shrink-0 flex-col gap-2 p-3">
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        Mensagens por dia · 7 dias
      </p>
      <div className="flex h-24 items-end gap-2" role="img" aria-label="Mensagens por dia nos últimos 7 dias">
        {days.map((day, index) => (
          <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {day.value}
            </span>
            <div
              className={cn(
                'fx-grow-y w-full rounded-t-md bg-gradient-to-t from-primary/40 to-primary',
                index === days.length - 1 && 'from-[var(--neon-2)]/50 to-[var(--neon-2)] shadow-[0_0_16px_-2px_var(--neon-2)]',
              )}
              style={{ height: `${Math.max(4, (day.value / max) * 60)}px`, animationDelay: `${index * 60}ms` }}
            />
            <span className="text-[10px] text-muted-foreground capitalize">{day.label}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * Card que mostra só os itens que cabem na altura disponível, sem barra de rolagem:
 * mede o espaço e calcula quantos itens desenhar.
 */
function FitCard({
  title,
  itemHeight,
  empty,
  children,
}: {
  title: string
  itemHeight: number
  empty: string | null
  children: (count: number) => ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(5)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const height = entry?.contentRect.height ?? 0
      setCount(Math.max(1, Math.floor(height / itemHeight)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [itemHeight])
  return (
    <Card className="flex min-h-[180px] flex-1 flex-col gap-3 p-4">
      <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{title}</p>
      <div ref={ref} className="min-h-0 flex-1 overflow-hidden">
        {empty ? <p className="text-sm text-muted-foreground">{empty}</p> : children(count)}
      </div>
    </Card>
  )
}

export function BrainPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const overview = useQuery({ queryKey: ['overview'], queryFn: fetchOverview, refetchInterval: POLL_MS })
  const conversations = useQuery({
    queryKey: ['conversations', '', ''],
    queryFn: () => fetchConversations({ channel: '', connectionId: '' }),
    refetchInterval: POLL_MS * 2,
  })
  const connections = useQuery({ queryKey: ['connections'], queryFn: fetchInboxConnections })
  const analyses = useQuery({ queryKey: ['analyses'], queryFn: fetchAnalyses })

  const graph: GraphConversation[] = useMemo(() => {
    const activity = new Map(
      (overview.data?.conversations ?? []).map((c) => [c.conversation_id, c]),
    )
    const analysed = new Map<string, number>()
    for (const analysis of analyses.data ?? []) {
      if (analysis.conversation_id) {
        analysed.set(analysis.conversation_id, (analysed.get(analysis.conversation_id) ?? 0) + 1)
      }
    }
    return (conversations.data ?? [])
      .map((conversation) => ({
        id: conversation.id,
        name: title(conversation),
        channel: conversation.channel,
        group: conversation.kind === 'group',
        messages: activity.get(conversation.id)?.messages ?? 0,
        last24h: activity.get(conversation.id)?.last_24h ?? 0,
        analyses: analysed.get(conversation.id) ?? 0,
      }))
      .sort((a, b) => b.messages - a.messages || b.last24h - a.last24h)
      .slice(0, GRAPH_LIMIT)
  }, [conversations.data, overview.data, analyses.data])

  const channelIds = useMemo(
    () => [...new Set((connections.data ?? []).map((connection) => connection.channel))],
    [connections.data],
  )
  const live = (connections.data ?? []).filter((c) => c.status === 'connected').length
  const groups = (conversations.data ?? []).filter((c) => c.kind === 'group').length
  const found = useMemo(() => findings(analyses.data ?? []), [analyses.data])
  const read = (analyses.data ?? []).reduce((sum, analysis) => sum + analysis.message_count, 0)
  const savedMinutes = Math.round((read * SECONDS_PER_MESSAGE) / 60)
  const hot = [...graph].filter((c) => c.last24h > 0).sort((a, b) => b.last24h - a.last24h)
  const hotMax = Math.max(1, ...hot.map((c) => c.last24h))
  const current = graph.find((c) => c.id === selected)
  const stageRef = useRef<HTMLDivElement>(null)
  const [fullscreen, toggleFullscreen] = useFullscreen(stageRef)

  return (
    <div
      ref={stageRef}
      className="fx-stage mx-auto flex w-full max-w-[1800px] flex-col gap-3 xl:h-[calc(100dvh-6.5rem)]"
    >
      <PageHeader
        title="Cérebro"
        subtitle="O que seus clientes estão dizendo, o que os agentes já entenderam e onde o relacionamento precisa de atenção, ao vivo."
        icon={BrainCircuit}
        actions={
          <>
            <Button variant="ghost" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              {fullscreen ? 'Sair da apresentação' : 'Apresentar'}
            </Button>
            <Button asChild>
              <Link href="/analises">
                <Sparkles className="size-4" aria-hidden /> Nova análise
              </Link>
            </Button>
          </>
        }
      />
      <FormError message={overview.error?.message ?? conversations.error?.message} />

      <div className="fx-stagger grid shrink-0 grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
        {overview.data ? (
          <Hero overview={overview.data} savedMinutes={savedMinutes} />
        ) : (
          <div className="feat-skeleton h-24 rounded-xl xl:row-span-2" />
        )}
        <Stat compact label="Conversas monitoradas" value={conversations.data?.length ?? 0} icon={MessagesSquare} />
        <Stat compact label="Grupos" value={groups} icon={UsersRound} />
        <Stat compact label="Pessoas falando" value={overview.data?.people ?? 0} icon={Users} />
        <Stat compact label="Contas capturando" value={live} icon={Cable} />
        <Stat compact label="Análises dos agentes" value={analyses.data?.length ?? 0} icon={Sparkles} />
        <Stat compact label="Mensagens lidas pela IA" value={read} icon={CheckCheck} />
        <Stat compact label="Pendências encontradas" value={found.tasks} icon={ListTodo} />
        <Stat compact label="Decisões encontradas" value={found.decisions} icon={Gavel} />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="relative min-h-[480px] overflow-hidden p-0 xl:min-h-0">
          <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#25D366]" /> Conversa (cor do conector) · tamanho = volume
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full border-2 border-[#8b5cf6]" /> Já analisada pelo agente
            </span>
            <span className="flex items-center gap-2">
              <span className="fx-live-dot !size-2" /> Atividade nas últimas 24 h
            </span>
          </div>
          {conversations.isPending ? (
            <div className="flex h-full items-center justify-center">
              <div className="feat-skeleton size-64 rounded-full" />
            </div>
          ) : (
            <BrainGraph
              conversations={graph}
              channelIds={channelIds}
              selected={selected}
              onSelect={setSelected}
              pulseKey={overview.data?.total_messages ?? 0}
            />
          )}
          {current && (
            <div className="fx-pop absolute right-3 bottom-3 left-3 z-10 flex flex-wrap items-center gap-4 rounded-xl border border-primary/40 bg-popover/90 p-4 shadow-[0_0_40px_-12px_var(--neon-1)] backdrop-blur-xl sm:left-auto sm:w-[420px]">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{current.name}</p>
                <p className="text-xs text-muted-foreground">
                  {channelLabel(current.channel)} · {current.group ? 'Grupo' : 'Direta'} ·{' '}
                  {current.messages} mensagens · {current.last24h} em 24 h ·{' '}
                  {current.analyses} {current.analyses === 1 ? 'análise' : 'análises'}
                </p>
              </div>
              <Button asChild size="sm">
                <Link href={`/analises?conversa=${current.id}`}>
                  <Sparkles className="size-4" aria-hidden /> Analisar
                </Link>
              </Button>
            </div>
          )}
        </Card>

        <div className="flex min-h-0 flex-col gap-3">
          {overview.data && <WeekChart overview={overview.data} />}
          <FitCard title="Mais ativas nas últimas 24 h" itemHeight={52} empty={hot.length === 0 ? 'Sem atividade recente.' : null}>
            {(count) => (
              <ul className="fx-stagger flex flex-col gap-3">
                {hot.slice(0, count).map((conversation, index) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(conversation.id)}
                      className="flex w-full items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-muted"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-sm font-semibold text-primary-ink">
                        {index + 1}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="flex justify-between gap-2">
                          <span className="truncate text-sm font-medium">{conversation.name}</span>
                          <span className="font-mono text-sm text-muted-foreground">{conversation.last24h}</span>
                        </span>
                        <span className="h-2 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-primary to-[var(--neon-2)] transition-[width] duration-700"
                            style={{ width: `${(conversation.last24h / hotMax) * 100}%` }}
                          />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FitCard>
          <FitCard
            title="Atividade do agente"
            itemHeight={62}
            empty={(analyses.data ?? []).length === 0 ? 'Nenhuma análise ainda.' : null}
          >
            {(count) => (
              <ol className="relative ml-2 flex flex-col gap-3 border-l border-[var(--neon-3)]/40">
                {(analyses.data ?? []).slice(0, count).map((analysis) => (
                  <li key={analysis.id} className="relative pl-5">
                    <span className="absolute top-2 -left-[6px] size-3 rounded-full bg-[var(--neon-3)] shadow-[0_0_8px_var(--neon-3)]" />
                    <p className="line-clamp-1 text-sm font-medium">{analysis.prompt_text}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(analysis.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} ·{' '}
                      {analysis.message_count} mensagens ·{' '}
                      {analysis.status === 'running' ? 'em andamento' : analysis.status === 'failed' ? 'falhou' : 'concluída'}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </FitCard>
        </div>
      </div>
    </div>
  )
}
