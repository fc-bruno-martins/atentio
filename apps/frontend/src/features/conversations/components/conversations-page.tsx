'use client'

import { useQuery } from '@tanstack/react-query'
import {
  CalendarRange,
  CheckSquare,
  MessagesSquare,
  MousePointerClick,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormError } from '@/components/ui/field'
import { Initials } from '@/components/ui/initials'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/textarea'
import { channelLabel, ConnectorBadge, formatAccount } from '@/features/shared'
import { cn } from '@/lib/utils'
import {
  fetchConversations,
  fetchInboxChannels,
  fetchInboxConnections,
  fetchMessages,
  periodRange,
  type Conversation,
  type Message,
  type MessageType,
  type Period,
} from '../services/conversations'

const POLL_INTERVAL_MS = 15_000
const NO_PERIOD: Period = { from: '', to: '' }

const MEDIA_LABELS: Record<Exclude<MessageType, 'text'>, string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  document: 'Documento',
  sticker: 'Figurinha',
  other: 'Mensagem sem texto',
}

function title(conversation: Conversation): string {
  if (conversation.name) return conversation.name
  return conversation.kind === 'group' ? 'Grupo sem nome' : `+${conversation.contact}`
}

function isoDay(offsetDays = 0): string {
  const now = new Date()
  now.setDate(now.getDate() - offsetDays)
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

function relativeTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes} min`
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h`
  if (minutes < 48 * 60) return 'ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function dayLabel(value: string): string {
  const date = new Date(value)
  const key = date.toDateString()
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (key === today.toDateString()) return 'Hoje'
  if (key === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

const time = (value: string) =>
  new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Destaca o termo buscado dentro do texto. */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={index} className="rounded bg-primary/30 px-0.5 text-foreground">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}

const PERIODS: { label: string; period: () => Period }[] = [
  { label: 'Tudo', period: () => NO_PERIOD },
  { label: 'Hoje', period: () => ({ from: isoDay(), to: isoDay() }) },
  { label: '7 dias', period: () => ({ from: isoDay(6), to: isoDay() }) },
  { label: '30 dias', period: () => ({ from: isoDay(29), to: isoDay() }) },
]

function MessageBubble({
  message,
  group,
  term,
}: {
  message: Message
  group: boolean
  term: string
}) {
  const media = message.type === 'text' ? null : MEDIA_LABELS[message.type]
  const showSender = group && !message.from_me && message.sender_name
  return (
    <li
      className={cn(
        'group flex items-end gap-2',
        message.from_me ? 'fx-in-right flex-row-reverse' : 'fx-in-left',
      )}
    >
      {group && !message.from_me ? (
        <Initials name={message.sender_name ?? '?'} className="size-7 text-[10px]" />
      ) : null}
      <div
        className={cn(
          'relative max-w-[78%] rounded-2xl border px-3 py-2 text-sm transition-all duration-200',
          message.from_me
            ? 'rounded-br-sm border-primary/20 bg-accent text-accent-foreground'
            : 'rounded-bl-sm border-border bg-muted',
        )}
      >
        {showSender && (
          <p className="mb-0.5 text-xs font-semibold text-primary-ink">{message.sender_name}</p>
        )}
        {media && <p className="text-xs italic text-muted-foreground">{media}</p>}
        {message.text && (
          <p className="whitespace-pre-wrap break-words">
            <Highlight text={message.text} term={term} />
          </p>
        )}
        <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">
          {time(message.sent_at)}
        </p>
      </div>
    </li>
  )
}

function DaySeparator({ children }: { children: ReactNode }) {
  return (
    <li className="sticky top-0 z-10 flex justify-center py-1" role="presentation">
      <span className="rounded-full border border-border bg-background/80 px-3 py-0.5 text-[11px] font-medium text-muted-foreground capitalize backdrop-blur">
        {children}
      </span>
    </li>
  )
}

function Workspace({ conversation }: { conversation: Conversation }) {
  const [period, setPeriod] = useState<Period>(NO_PERIOD)
  const [custom, setCustom] = useState(false)
  const [term, setTerm] = useState('')
  const listRef = useRef<HTMLUListElement>(null)
  const { data, error, isPending } = useQuery({
    queryKey: ['messages', conversation.id, period],
    queryFn: () => fetchMessages(conversation.id, period),
    refetchInterval: POLL_INTERVAL_MS,
  })
  const set = (field: keyof Period) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setPeriod({ ...period, [field]: event.target.value })

  const messages = useMemo(() => data?.messages ?? [], [data])
  const visible = useMemo(
    () =>
      term
        ? messages.filter((m) => m.text?.toLowerCase().includes(term.toLowerCase()))
        : messages,
    [messages, term],
  )
  const rows = useMemo(
    () =>
      visible.map((message, index) => {
        const day = dayLabel(message.sent_at)
        const previous = visible[index - 1]
        return { message, day, firstOfDay: !previous || dayLabel(previous.sent_at) !== day }
      }),
    [visible],
  )

  // Leva para as mensagens mais recentes ao abrir a conversa ou mudar o período.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [conversation.id, period, messages.length])

  const activePreset = PERIODS.find(
    (preset) => JSON.stringify(preset.period()) === JSON.stringify(period),
  )?.label

  return (
    <>
      <Card className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="fx-enter flex items-center gap-3 border-b border-border p-3">
          <Initials name={title(conversation)} />
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 truncate font-semibold">
              {title(conversation)}
              {conversation.kind === 'group' && (
                <Users className="size-4 text-muted-foreground" aria-hidden />
              )}
            </h2>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ConnectorBadge channel={conversation.channel} />
              <span className="fx-live-dot !size-1.5" aria-hidden />
              {messages.length} mensagens
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={`/analises?conversa=${conversation.id}`}>
              <Sparkles className="size-4" aria-hidden />
              Analisar
            </Link>
          </Button>
          <div className="relative hidden sm:block">
            <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" aria-hidden />
            <Input
              aria-label="Buscar nas mensagens"
              placeholder="Buscar nas mensagens"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="h-8 w-48 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2">
          <CalendarRange className="size-4 text-muted-foreground" aria-hidden />
          {PERIODS.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant={activePreset === preset.label && !custom ? 'default' : 'ghost'}
              className="h-7 px-2.5 text-xs"
              aria-pressed={activePreset === preset.label && !custom}
              onClick={() => {
                setCustom(false)
                setPeriod(preset.period())
              }}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={custom ? 'default' : 'ghost'}
            className="h-7 px-2.5 text-xs"
            aria-pressed={custom}
            onClick={() => setCustom((value) => !value)}
          >
            Personalizar
          </Button>
          {custom && (
            <div className="fx-enter flex w-full flex-wrap items-end gap-3 pt-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="from" className="text-xs">
                  De
                </Label>
                <Input id="from" type="date" value={period.from} onChange={set('from')} className="h-8" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="to" className="text-xs">
                  Até
                </Label>
                <Input id="to" type="date" value={period.to} onChange={set('to')} className="h-8" />
              </div>
            </div>
          )}
        </div>

        <FormError message={error?.message} />
        <ul
          ref={listRef}
          className="flex min-h-[320px] flex-1 flex-col gap-2 overflow-y-auto p-3 pb-4"
        >
          {isPending &&
            [0, 1, 2, 3].map((index) => (
              <li
                key={index}
                className={cn('feat-skeleton h-12 w-2/3 rounded-2xl', index % 2 && 'self-end')}
              />
            ))}
          {data?.messages.length === 0 && (
            <li className="m-auto text-sm text-muted-foreground">Nenhuma mensagem neste período.</li>
          )}
          {term && data && visible.length === 0 && (
            <li className="m-auto text-sm text-muted-foreground">Nada encontrado para “{term}”.</li>
          )}
          {rows.map(({ message, day, firstOfDay }) => {
            return [
              firstOfDay ? <DaySeparator key={`d-${day}`}>{day}</DaySeparator> : null,
              <MessageBubble
                key={message.id}
                message={message}
                group={conversation.kind === 'group'}
                term={term}
              />,
            ]
          })}
        </ul>

      </Card>

    </>
  )
}

export function ConversationsPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState('')
  const [connectionId, setConnectionId] = useState('')
  const { data, error, isPending } = useQuery({
    queryKey: ['conversations', channel, connectionId],
    queryFn: () => fetchConversations({ channel, connectionId }),
    refetchInterval: POLL_INTERVAL_MS,
  })
  const channels = useQuery({ queryKey: ['channels'], queryFn: fetchInboxChannels })
  const connections = useQuery({ queryKey: ['connections'], queryFn: fetchInboxConnections })
  const accounts = (connections.data ?? []).filter((c) => !channel || c.channel === channel)
  const chooseChannel = (next: string) => {
    setChannel(next)
    setConnectionId('')
    setSelected(null)
  }
  const visible = useMemo(
    () =>
      (data ?? []).filter((conversation) =>
        title(conversation).toLowerCase().includes(search.toLowerCase()),
      ),
    [data, search],
  )
  const current = data?.find((conversation) => conversation.id === selected)

  // Setas para cima e para baixo trocam de conversa.
  const onListKey = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const index = visible.findIndex((conversation) => conversation.id === selected)
    const next = visible[event.key === 'ArrowDown' ? index + 1 : Math.max(index - 1, 0)]
    if (next) setSelected(next.id)
  }

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <PageHeader
        title="Conversas"
        subtitle="Todas as conversas com seus clientes, de todos os conectores, em linha do tempo."
        icon={MessagesSquare}
        actions={
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por conector">
            {[{ id: '', name: 'Todos' }, ...(channels.data ?? [])].map((item) => (
              <Button
                key={item.id || 'todos'}
                size="sm"
                variant={channel === item.id ? 'default' : 'ghost'}
                aria-pressed={channel === item.id}
                onClick={() => chooseChannel(item.id)}
              >
                {item.name}
              </Button>
            ))}
            {accounts.length > 1 && (
              <NativeSelect
                aria-label="Filtrar por conta"
                value={connectionId}
                onChange={(event) => setConnectionId(event.target.value)}
                className="h-8 w-auto"
              >
                <option value="">Todas as contas</option>
                {accounts.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {channelLabel(connection.channel)} · {formatAccount(connection)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </div>
        }
      />
      <FormError message={error?.message} />
      {data?.length === 0 && (
        <EmptyState
          icon={MessagesSquare}
          title="Nenhuma conversa capturada"
          subtitle="As mensagens aparecem aqui assim que chegarem a uma conta conectada."
        />
      )}
      {(isPending || (data && data.length > 0)) && (
        <div className="grid gap-4 lg:h-[calc(100dvh-11rem)] lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="flex min-h-0 flex-col gap-2 p-3">
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
              <Input
                aria-label="Buscar conversa"
                placeholder="Buscar conversa"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-8"
              />
            </div>
            <p className="px-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {visible.length} conversas · ↑↓ para navegar
            </p>
            <ul
              className="fx-stagger -mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1"
              onKeyDown={onListKey}
            >
              {isPending &&
                [0, 1, 2, 3, 4, 5].map((index) => (
                  <li key={index} className="feat-skeleton h-12 rounded-lg" />
                ))}
              {visible.map((conversation) => {
                const active = conversation.id === selected
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(conversation.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg border border-transparent p-2 text-left text-sm transition-all hover:translate-x-0.5 hover:bg-muted',
                        active &&
                          'border-primary/30 bg-primary/10 shadow-[0_0_16px_-6px_var(--neon-1)]',
                      )}
                    >
                      <Initials name={title(conversation)} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-1.5">
                          {conversation.kind === 'group' && (
                            <Users className="size-3.5 shrink-0 text-muted-foreground" aria-label="Grupo" />
                          )}
                          <span className={cn('truncate font-medium', active && 'text-primary-ink')}>
                            <Highlight text={title(conversation)} term={search} />
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ConnectorBadge channel={conversation.channel} />
                          <span className="ml-auto font-mono text-[10px]">
                            {relativeTime(conversation.last_message_at)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
          {current ? (
            <Workspace key={current.id} conversation={current} />
          ) : (
            <>
              <EmptyState
                className="min-h-[320px]"
                icon={MessagesSquare}
                title="Escolha uma conversa"
                subtitle="As mensagens aparecem aqui, em linha do tempo. Para analisar, use Analisar ou o menu Análises."
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
