'use client'

import { useQuery } from '@tanstack/react-query'
import { Maximize2, MessagesSquare, Minimize2, Radio, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { fetchConversations } from '@/features/conversations'
import { useFullscreen } from '@/lib/use-fullscreen'
import { channelLabel } from '@/features/shared'
import { ChannelStep } from './studio-channel-step'
import { ConfigStep } from './studio-config-step'
import { conversationTitle, EMPTY_DRAFT, scopeLabel, type Draft } from './studio-draft'
import { PipelineTimeline } from './studio-pipeline-timeline'
import { RunStep } from './studio-run-step'
import { SourceStep } from './studio-source-step'

/**
 * Pipeline de análise em linha do tempo: Conector → Origem → Configuração → Execução.
 * Pode começar já com uma conversa escolhida (link vindo de Conversas).
 */
export function AnalysisStudio({ initialConversationId }: { initialConversationId?: string }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [run, setRun] = useState(0)
  const [pending, setPending] = useState(initialConversationId)
  const stageRef = useRef<HTMLDivElement>(null)
  const [fullscreen, toggleFullscreen] = useFullscreen(stageRef)
  const change = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }))

  // Link de Conversas: assim que a lista chega, pula para a Origem com a conversa escolhida.
  const all = useQuery({
    queryKey: ['conversations', '', ''],
    queryFn: () => fetchConversations({ channel: '', connectionId: '' }),
    enabled: Boolean(pending),
  })
  if (pending && all.data) {
    const conversation = all.data.find((item) => item.id === pending)
    setPending(undefined)
    if (conversation) {
      setDraft({ ...EMPTY_DRAFT, channel: conversation.channel, conversation })
      setStep(1)
    }
  }

  const restart = () => {
    setDraft(EMPTY_DRAFT)
    setStep(0)
  }

  const steps = [
    { label: 'Conector', icon: Radio, summary: draft.channel ? channelLabel(draft.channel) : undefined },
    {
      label: 'Origem',
      icon: MessagesSquare,
      summary: draft.conversation
        ? `${conversationTitle(draft.conversation)} · ${scopeLabel(draft.selectedIds.length, draft.scope)}`
        : undefined,
    },
    {
      label: 'Configuração',
      icon: SlidersHorizontal,
      summary: step > 2 ? `${draft.promptTitle || 'Prompt'} · ${draft.presetLabel}` : undefined,
    },
    { label: 'Execução', icon: Sparkles, summary: step === 3 ? 'Coletor, extrator, analista e estruturador' : undefined },
  ]

  return (
    <div ref={stageRef} className="fx-stage flex flex-col gap-8">
      <div className="flex items-start gap-4">
        <div className="-my-6 min-w-0 flex-1 overflow-x-auto px-4 py-6">
          <PipelineTimeline steps={steps} current={step} onGo={setStep} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Sair do modo telão' : 'Modo telão'}
        >
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          <span className="hidden lg:inline">{fullscreen ? 'Sair do telão' : 'Modo telão'}</span>
        </Button>
      </div>

      <div key={step === 3 ? `run-${run}` : step} className="fx-enter">
        {step === 0 && (
          <ChannelStep
            value={draft.channel}
            onPick={(channel) => {
              if (channel !== draft.channel) change({ ...EMPTY_DRAFT, channel })
              setStep(1)
            }}
          />
        )}
        {step === 1 && <SourceStep draft={draft} onChange={change} onNext={() => setStep(2)} />}
        {step === 2 && (
          <ConfigStep
            draft={draft}
            onChange={change}
            onRun={() => {
              setRun((value) => value + 1)
              setStep(3)
            }}
          />
        )}
        {step === 3 && <RunStep draft={draft} onRestart={restart} />}
      </div>
    </div>
  )
}
