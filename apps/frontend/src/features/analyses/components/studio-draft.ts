import {
  fetchMessages,
  type Conversation,
  type Message,
  type Period,
} from '@/features/conversations'

export type Scope = 'latest' | 'period' | 'selection'

/** O que a pessoa escolheu em cada etapa do pipeline. */
export interface Draft {
  channel: string
  conversation: Conversation | null
  scope: Scope
  period: Period
  selectedIds: string[]
  promptId: string
  promptTitle: string
  text: string
  preset: string
  presetLabel: string
}

export const NO_PERIOD: Period = { from: '', to: '' }

export const EMPTY_DRAFT: Draft = {
  channel: '',
  conversation: null,
  scope: 'latest',
  period: NO_PERIOD,
  selectedIds: [],
  promptId: '',
  promptTitle: '',
  text: '',
  preset: '',
  presetLabel: '',
}

export function conversationTitle(conversation: Conversation): string {
  if (conversation.name) return conversation.name
  return conversation.kind === 'group' ? 'Grupo sem nome' : `+${conversation.contact}`
}

/** Mensagens que entram na análise, conforme o escopo escolhido. */
export function scopedMessages(draft: Draft, messages: Message[]): Message[] {
  if (draft.scope === 'selection') return messages.filter((m) => draft.selectedIds.includes(m.id))
  return messages.slice(-500)
}

export function scopeLabel(selected: number, scope: Scope): string {
  if (scope === 'selection') {
    return selected === 1 ? '1 mensagem selecionada' : `${selected} mensagens selecionadas`
  }
  return scope === 'period' ? 'Mensagens do período' : 'Últimas 500 mensagens da conversa'
}

export function isoDay(offsetDays = 0): string {
  const now = new Date()
  now.setDate(now.getDate() - offsetDays)
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

/** Consulta das mensagens da origem; Execução reaproveita o mesmo cache da Origem. */
export function messagesQuery(draft: Draft) {
  const id = draft.conversation?.id ?? ''
  const period = draft.scope === 'period' ? draft.period : NO_PERIOD
  return {
    queryKey: ['messages', id, period],
    queryFn: () => fetchMessages(id, period),
    enabled: Boolean(id),
  }
}
