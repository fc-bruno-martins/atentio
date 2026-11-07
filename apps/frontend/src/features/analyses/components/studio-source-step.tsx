'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarRange, Layers, ListChecks, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormError } from '@/components/ui/field'
import { Initials } from '@/components/ui/initials'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchConversations, type Conversation, type Period } from '@/features/conversations'
import { channelLabel, ConnectorBadge } from '@/features/shared'
import { cn } from '@/lib/utils'
import { StepIntro } from './studio-channel-step'
import {
  conversationTitle,
  isoDay,
  messagesQuery,
  NO_PERIOD,
  scopedMessages,
  type Draft,
  type Scope,
} from './studio-draft'

const KINDS = [
  { id: '', label: 'Todas' },
  { id: 'group', label: 'Grupos' },
  { id: 'direct', label: 'Diretas' },
] as const

const SCOPES: { id: Scope; label: string; hint: string; icon: typeof Layers }[] = [
  { id: 'latest', label: 'Mais recentes', hint: 'Até 500 mensagens', icon: Layers },
  { id: 'period', label: 'Período', hint: 'Um dia ou intervalo', icon: CalendarRange },
  { id: 'selection', label: 'Selecionar', hint: 'Escolha uma a uma', icon: ListChecks },
]

const PRESETS: { label: string; period: () => Period }[] = [
  { label: 'Hoje', period: () => ({ from: isoDay(), to: isoDay() }) },
  { label: 'Ontem', period: () => ({ from: isoDay(1), to: isoDay(1) }) },
  { label: '7 dias', period: () => ({ from: isoDay(6), to: isoDay() }) },
  { label: '30 dias', period: () => ({ from: isoDay(29), to: isoDay() }) },
]

const time = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function ConversationPicker({
  channel,
  value,
  onPick,
}: {
  channel: string
  value: Conversation | null
  onPick: (conversation: Conversation) => void
}) {
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('')
  const { data, error, isPending } = useQuery({
    queryKey: ['conversations', channel, ''],
    queryFn: () => fetchConversations({ channel, connectionId: '' }),
  })
  const visible = useMemo(
    () =>
      (data ?? []).filter(
        (conversation) =>
          (!kind || conversation.kind === kind) &&
          conversationTitle(conversation).toLowerCase().includes(search.toLowerCase()),
      ),
    [data, kind, search],
  )

  return (
    <Card className="flex min-h-0 flex-col gap-3 p-4">
      <div className="relative">
        <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
        <Input
          aria-label="Buscar conversa"
          placeholder="Buscar grupo ou contato"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-8"
        />
      </div>
      <div className="flex gap-1.5" role="group" aria-label="Tipo de conversa">
        {KINDS.map((item) => (
          <Button
            key={item.id || 'all'}
            size="sm"
            variant={kind === item.id ? 'default' : 'ghost'}
            className="h-7 text-xs"
            aria-pressed={kind === item.id}
            onClick={() => setKind(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <FormError message={error?.message} />
      <ul className="fx-stagger -mx-1 flex max-h-[52vh] flex-col gap-0.5 overflow-y-auto px-1">
        {isPending &&
          [0, 1, 2, 3].map((index) => <li key={index} className="feat-skeleton h-12 rounded-lg" />)}
        {data && visible.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">Nenhuma conversa.</li>
        )}
        {visible.map((conversation) => {
          const active = value?.id === conversation.id
          return (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => onPick(conversation)}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left text-sm transition-all hover:translate-x-0.5 hover:bg-muted',
                  active && 'border-primary/40 bg-primary/10 shadow-[0_0_16px_-6px_var(--neon-1)]',
                )}
              >
                <Initials name={conversationTitle(conversation)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    {conversation.kind === 'group' && (
                      <Users className="size-3.5 text-muted-foreground" aria-label="Grupo" />
                    )}
                    <span className="truncate">{conversationTitle(conversation)}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <ConnectorBadge channel={conversation.channel} iconOnly className="mr-1 px-1 align-middle" />
                    {time(conversation.last_message_at)}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/** Etapa 2: qual conversa e quais mensagens dela entram na análise. */
export function SourceStep({
  draft,
  onChange,
  onNext,
}: {
  draft: Draft
  onChange: (changes: Partial<Draft>) => void
  onNext: () => void
}) {
  const messages = useQuery(messagesQuery(draft))
  const all = messages.data?.messages ?? []
  const inScope = scopedMessages(draft, all)
  const toggle = (id: string) =>
    onChange({
      selectedIds: draft.selectedIds.includes(id)
        ? draft.selectedIds.filter((item) => item !== id)
        : [...draft.selectedIds, id],
    })
  const ready =
    draft.conversation !== null &&
    inScope.length > 0 &&
    (draft.scope !== 'period' || Boolean(draft.period.from || draft.period.to))

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        title="Qual conversa e quais mensagens?"
        text="Escolha um grupo ou contato e defina o recorte que a IA vai ler."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <ConversationPicker
          channel={draft.channel}
          value={draft.conversation}
          onPick={(conversation) =>
            onChange({ conversation, selectedIds: [], scope: 'latest', period: NO_PERIOD })
          }
        />
        <Card className="flex min-h-[320px] flex-col gap-4 p-4">
          {!draft.conversation ? (
            <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
              Escolha uma conversa à esquerda para definir o recorte.
            </p>
          ) : (
            <>
              <div className="fx-enter flex items-center gap-3">
                <Initials name={conversationTitle(draft.conversation)} className="size-11" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">
                    {conversationTitle(draft.conversation)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {channelLabel(draft.conversation.channel)} ·{' '}
                    {draft.conversation.kind === 'group' ? 'Grupo' : 'Conversa direta'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Recorte">
                {SCOPES.map((scope) => (
                  <button
                    key={scope.id}
                    type="button"
                    aria-pressed={draft.scope === scope.id}
                    onClick={() => onChange({ scope: scope.id })}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5',
                      draft.scope === scope.id
                        ? 'border-primary bg-primary/10 shadow-[0_0_20px_-8px_var(--neon-1)]'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    <scope.icon className="size-5 text-primary-ink" aria-hidden />
                    <span className="text-sm font-semibold">{scope.label}</span>
                    <span className="text-xs text-muted-foreground">{scope.hint}</span>
                  </button>
                ))}
              </div>

              {draft.scope === 'period' && (
                <div className="fx-enter flex flex-wrap items-end gap-2">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      size="sm"
                      variant={
                        JSON.stringify(preset.period()) === JSON.stringify(draft.period)
                          ? 'default'
                          : 'ghost'
                      }
                      onClick={() => onChange({ period: preset.period() })}
                    >
                      {preset.label}
                    </Button>
                  ))}
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="from" className="text-xs">
                      De
                    </Label>
                    <Input
                      id="from"
                      type="date"
                      value={draft.period.from}
                      onChange={(event) =>
                        onChange({ period: { ...draft.period, from: event.target.value } })
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="to" className="text-xs">
                      Até
                    </Label>
                    <Input
                      id="to"
                      type="date"
                      value={draft.period.to}
                      onChange={(event) =>
                        onChange({ period: { ...draft.period, to: event.target.value } })
                      }
                      className="h-8"
                    />
                  </div>
                </div>
              )}

              <FormError message={messages.error?.message} />
              <ul className="flex max-h-[38vh] flex-col gap-1.5 overflow-y-auto rounded-lg border border-border bg-background/40 p-2">
                {messages.isPending &&
                  [0, 1, 2].map((index) => (
                    <li key={index} className="feat-skeleton h-10 rounded-lg" />
                  ))}
                {messages.data && all.length === 0 && (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    Nenhuma mensagem neste recorte.
                  </li>
                )}
                {all.map((message) => {
                  const selecting = draft.scope === 'selection'
                  const checked = draft.selectedIds.includes(message.id)
                  const included = !selecting || checked
                  return (
                    <li
                      key={message.id}
                      className={cn(
                        'flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-all',
                        selecting && 'cursor-pointer hover:bg-muted',
                        included ? 'opacity-100' : 'opacity-45',
                        checked && 'bg-primary/10',
                      )}
                      onClick={selecting ? () => toggle(message.id) : undefined}
                    >
                      {selecting && (
                        <input
                          type="checkbox"
                          className="mt-1 size-4 accent-[#25e2af]"
                          aria-label={`Selecionar mensagem de ${time(message.sent_at)}`}
                          checked={checked}
                          onChange={() => toggle(message.id)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-primary-ink">
                          {message.from_me ? 'Eu' : (message.sender_name ?? 'Contato')}
                        </span>{' '}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {time(message.sent_at)}
                        </span>
                        <span className="block break-words">
                          {message.text ?? <em className="text-muted-foreground">Mídia sem texto</em>}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Card>
      </div>
      <StepFooter
        info={
          draft.conversation
            ? `${inScope.length} ${inScope.length === 1 ? 'mensagem entra' : 'mensagens entram'} na análise`
            : 'Nenhuma conversa escolhida'
        }
        action={
          <Button size="lg" onClick={onNext} disabled={!ready}>
            Configurar análise
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        }
      />
    </div>
  )
}

export function StepFooter({ info, action }: { info: string; action: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-4 rounded-xl border border-border bg-background/80 px-4 py-3 backdrop-blur-xl">
      <p className="font-mono text-sm text-muted-foreground">{info}</p>
      {action}
    </div>
  )
}
