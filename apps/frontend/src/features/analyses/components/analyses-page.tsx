'use client'

import { useQuery } from '@tanstack/react-query'
import { Bug, ChevronDown, Cpu, History as HistoryIcon, MessagesSquare, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Stat } from '@/components/ui/stat'
import { formatDate, useModelName } from '@/features/shared'
import { cn } from '@/lib/utils'
import { fetchAnalyses, type Analysis } from '../services/analyses'
import { AnalysisResult } from './analysis-result'
import { HarnessDebug } from './harness-debug'
import { AnalysisStudio } from './studio-analysis-studio'

function HistoryItem({ analysis }: { analysis: Analysis }) {
  const [open, setOpen] = useState(false)
  const [debug, setDebug] = useState(false)
  const modelName = useModelName()
  const failed = analysis.status === 'failed'
  return (
    <li className="relative pl-8">
      <span
        aria-hidden
        className={cn(
          'absolute top-5 left-0 size-3 -translate-x-1/2 rounded-full border-2 border-background',
          failed ? 'bg-destructive' : 'bg-primary shadow-[0_0_10px_var(--neon-1)]',
        )}
      />
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span
          className={cn(
            'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
            failed ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary-ink',
          )}
        >
          <Sparkles className="size-4" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 text-sm font-medium">{analysis.prompt_text}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(analysis.created_at)} · {analysis.message_count} mensagens ·{' '}
            {modelName(analysis.model)}
          </span>
        </span>
        {failed && <Badge variant="destructive">Falhou</Badge>}
        <ChevronDown
          className={cn(
            'mt-1 size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {analysis.result && (
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300',
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <AnalysisResult analysis={analysis} stream={false} className="m-4 mt-0" />
            {(analysis.steps?.length ?? 0) > 0 && (
              <div className="m-4 mt-0 flex flex-col gap-3">
                <Button variant="ghost" size="sm" className="w-fit" onClick={() => setDebug((value) => !value)}>
                  <Bug className="size-4" aria-hidden />
                  {debug ? 'Esconder debug do harness' : 'Ver debug do harness'}
                </Button>
                {debug && <HarnessDebug analysis={analysis} />}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
    </li>
  )
}

function History() {
  const [search, setSearch] = useState('')
  const { data, error, isPending } = useQuery({ queryKey: ['analyses'], queryFn: fetchAnalyses })
  const visible = useMemo(() => {
    const term = search.toLowerCase()
    return (data ?? []).filter(
      (analysis) =>
        !term ||
        analysis.prompt_text.toLowerCase().includes(term) ||
        analysis.result?.toLowerCase().includes(term),
    )
  }, [data, search])
  const messages = (data ?? []).reduce((total, analysis) => total + analysis.message_count, 0)
  const models = new Set((data ?? []).map((analysis) => analysis.model)).size

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <FormError message={error?.message} />
      {data && data.length > 0 && (
        <div className="fx-stagger grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Análises feitas" value={data.length} icon={Sparkles} />
          <Stat label="Mensagens lidas pela IA" value={messages} icon={MessagesSquare} />
          <Stat label="Modelos usados" value={models} icon={Cpu} />
        </div>
      )}
      {data && data.length > 0 && (
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input
            aria-label="Buscar nas análises"
            placeholder="Buscar por pergunta ou resposta"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>
      )}
      {isPending && [0, 1, 2].map((index) => <div key={index} className="feat-skeleton h-20 rounded-xl" />)}
      {data?.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="Nenhuma análise ainda"
          subtitle="Use a aba Nova análise para criar a primeira."
        />
      )}
      {visible.length > 0 && (
        <ol className="fx-stagger relative ml-2 flex flex-col gap-4 border-l border-primary/30">
          {visible.map((analysis) => (
            <HistoryItem key={analysis.id} analysis={analysis} />
          ))}
        </ol>
      )}
      {data && data.length > 0 && visible.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Nada encontrado para “{search}”.</p>
      )}
    </div>
  )
}

export function AnalysesPage({ initialConversationId }: { initialConversationId?: string }) {
  const [tab, setTab] = useState<'new' | 'history'>('new')
  const { data } = useQuery({ queryKey: ['analyses'], queryFn: fetchAnalyses })
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <PageHeader
        title="Análises"
        subtitle="Escolha a conversa com o cliente e a pergunta. Os agentes analisam, você revisa e o publicador leva o resultado adiante."
        icon={Sparkles}
        actions={
          <div
            role="tablist"
            aria-label="Análises"
            className="flex rounded-lg border border-border bg-muted p-1"
          >
            {(
              [
                ['new', 'Nova análise', Sparkles],
                ['history', `Histórico${data ? ` (${data.length})` : ''}`, HistoryIcon],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  tab === id
                    ? 'bg-primary text-primary-foreground shadow-[0_0_16px_-4px_var(--neon-1)]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        }
      />
      <div key={tab} className="fx-enter">
        {tab === 'new' ? <AnalysisStudio initialConversationId={initialConversationId} /> : <History />}
      </div>
    </div>
  )
}
