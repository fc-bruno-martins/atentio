'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { FormError } from '@/components/ui/field'
import { fetchConversations, fetchInboxChannels } from '@/features/conversations'
import { channelLook } from '@/features/shared'
import { cn } from '@/lib/utils'

/** Etapa 1: de qual canal vêm as conversas. */
export function ChannelStep({ value, onPick }: { value: string; onPick: (channel: string) => void }) {
  const channels = useQuery({ queryKey: ['channels'], queryFn: fetchInboxChannels })
  const conversations = useQuery({
    queryKey: ['conversations', '', ''],
    queryFn: () => fetchConversations({ channel: '', connectionId: '' }),
  })
  const count = (channel: string) =>
    conversations.data?.filter((conversation) => conversation.channel === channel).length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        title="De onde vêm as conversas?"
        text="Escolha o conector de conversa. A análise lê só o que a Atentio capturou nele."
      />
      <FormError message={channels.error?.message} />
      <div className="fx-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {channels.isPending &&
          [0, 1].map((index) => <div key={index} className="feat-skeleton h-44 rounded-2xl" />)}
        {channels.data?.map((channel) => {
          const look = channelLook(channel.id)
          const available = channel.status === 'available'
          const total = count(channel.id)
          return (
            <button
              key={channel.id}
              type="button"
              disabled={!available}
              onClick={() => onPick(channel.id)}
              aria-pressed={value === channel.id}
              data-slot="card"
              className={cn(
                'group flex flex-col gap-4 rounded-2xl border bg-card p-6 text-left transition-all duration-300',
                available ? 'hover:-translate-y-1' : 'cursor-not-allowed opacity-50',
                value === channel.id ? 'border-primary' : 'border-border',
              )}
            >
              <span
                className="grid size-16 place-items-center rounded-2xl border border-border bg-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ boxShadow: `0 0 30px -8px ${look.color}` }}
              >
                <look.icon className="size-9" aria-hidden />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-xl font-semibold">{channel.name}</span>
                <span className="text-sm text-muted-foreground">{look.description}</span>
              </span>
              <span className="mt-auto flex items-center justify-between">
                {available ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    {total} conversas capturadas
                  </span>
                ) : (
                  <Badge variant="secondary">Em breve</Badge>
                )}
                {available && (
                  <ArrowRight
                    className="size-5 text-primary-ink transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function StepIntro({ title, text }: { title: string; text: string }) {
  return (
    <div className="fx-enter flex flex-col gap-1">
      <h2 className="text-2xl font-semibold tracking-tight lg:text-3xl">{title}</h2>
      <p className="text-sm text-muted-foreground lg:text-base">{text}</p>
    </div>
  )
}
