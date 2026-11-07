'use client'

import { useQuery } from '@tanstack/react-query'
import { MessagesSquare, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AnalyzePanel } from '@/features/analyses'
import { channelLabel, formatAccount, formatDate } from '@/features/shared'
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

const today = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

function MessageBubble({
  message,
  group,
  selected,
  onToggle,
}: {
  message: Message
  group: boolean
  selected: boolean
  onToggle: () => void
}) {
  const media = message.type === 'text' ? null : MEDIA_LABELS[message.type]
  return (
    <li className={cn('flex items-start gap-2', message.from_me && 'justify-end')}>
      <input
        type="checkbox"
        className="mt-2"
        aria-label={`Selecionar mensagem de ${formatDate(message.sent_at)}`}
        checked={selected}
        onChange={onToggle}
      />
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
          message.from_me ? 'bg-accent text-accent-foreground' : 'bg-muted',
        )}
      >
        {group && !message.from_me && message.sender_name && (
          <p className="text-xs font-semibold">{message.sender_name}</p>
        )}
        {media && <p className="text-xs italic text-muted-foreground">{media}</p>}
        {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {formatDate(message.sent_at)}
        </p>
      </div>
    </li>
  )
}

function Messages({ conversation }: { conversation: Conversation }) {
  const [period, setPeriod] = useState<Period>(NO_PERIOD)
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string) =>
    setSelected((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]))
  const { data, error } = useQuery({
    queryKey: ['messages', conversation.id, period],
    queryFn: () => fetchMessages(conversation.id, period),
    refetchInterval: POLL_INTERVAL_MS,
  })
  const set = (field: keyof Period) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setPeriod({ ...period, [field]: event.target.value })

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">{title(conversation)}</h2>
        <Badge variant="secondary">{channelLabel(conversation.channel)}</Badge>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">De</Label>
          <Input id="from" type="date" value={period.from} onChange={set('from')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">Até</Label>
          <Input id="to" type="date" value={period.to} onChange={set('to')} />
        </div>
        <Button variant="outline" onClick={() => setPeriod({ from: today(), to: today() })}>
          Hoje
        </Button>
        <Button variant="ghost" onClick={() => setPeriod(NO_PERIOD)}>
          Limpar
        </Button>
      </div>
      <FormError message={error?.message} />
      {data?.messages.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma mensagem neste período.</p>
      )}
      <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
        {data?.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            group={conversation.kind === 'group'}
            selected={selected.includes(message.id)}
            onToggle={() => toggle(message.id)}
          />
        ))}
      </ul>
      <AnalyzePanel
        conversationId={conversation.id}
        period={periodRange(period)}
        selectedIds={selected}
      />
    </Card>
  )
}

export function ConversationsPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState('')
  const [connectionId, setConnectionId] = useState('')
  const { data, error } = useQuery({
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader
        title="Conversas"
        subtitle="Todas as suas conversas, de todos os canais, desde o início da captura."
        icon={MessagesSquare}
      />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por canal">
        {[{ id: '', name: 'Todos' }, ...(channels.data ?? [])].map((item) => (
          <Button
            key={item.id || 'todos'}
            size="sm"
            variant={channel === item.id ? 'default' : 'outline'}
            aria-pressed={channel === item.id}
            onClick={() => chooseChannel(item.id)}
          >
            {item.name}
          </Button>
        ))}
        {accounts.length > 1 && (
          <select
            aria-label="Filtrar por conta"
            value={connectionId}
            onChange={(event) => setConnectionId(event.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todas as contas</option>
            {accounts.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {channelLabel(connection.channel)} · {formatAccount(connection)}
              </option>
            ))}
          </select>
        )}
      </div>
      <FormError message={error?.message} />
      {data?.length === 0 && (
        <EmptyState
          icon={MessagesSquare}
          title="Nenhuma conversa capturada"
          subtitle="As mensagens aparecem aqui assim que chegarem a uma conta conectada."
        />
      )}
      {data && data.length > 0 && (
        <div className="flex flex-col gap-4 md:flex-row">
          <Card className="flex w-full flex-col gap-3 p-3 md:w-80">
            <Input
              aria-label="Buscar conversa"
              placeholder="Buscar"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <ul className="flex max-h-[65vh] flex-col overflow-y-auto">
              {visible.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(conversation.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted',
                      conversation.id === selected && 'bg-muted',
                    )}
                  >
                    {conversation.kind === 'group' && (
                      <Users className="size-4 shrink-0" aria-label="Grupo" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{title(conversation)}</span>
                    <Badge variant="secondary">{channelLabel(conversation.channel)}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          {current ? (
            <Messages key={current.id} conversation={current} />
          ) : (
            <EmptyState
              className="flex-1"
              icon={MessagesSquare}
              title="Escolha uma conversa"
            />
          )}
        </div>
      )}
    </div>
  )
}
