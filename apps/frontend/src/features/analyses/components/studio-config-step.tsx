'use client'

import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookmarkCheck,
  FileText,
  Gavel,
  ListTodo,
  MessageCircleReply,
  Play,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PresetPicker, usePresets } from '@/features/shared'
import { cn } from '@/lib/utils'
import { fetchPrompts } from '../services/analyses'
import { StepIntro } from './studio-channel-step'
import type { Draft } from './studio-draft'
import { StepFooter } from './studio-source-step'

/** Atalhos que só preenchem a pergunta; a pessoa pode editar antes de executar. */
const QUICK_PROMPTS = [
  {
    label: 'Saúde do cliente',
    icon: FileText,
    text: 'Como está a saúde do relacionamento com este cliente? Resuma e classifique.',
  },
  {
    label: 'Riscos de churn',
    icon: AlertTriangle,
    text: 'Há sinais de insatisfação ou risco de cancelamento? Quais e desde quando?',
  },
  {
    label: 'Compromissos',
    icon: ListTodo,
    text: 'Liste o que prometemos ao cliente, com responsável e prazo.',
  },
  {
    label: 'Cliente sem resposta',
    icon: MessageCircleReply,
    text: 'O que o cliente perguntou ou pediu e ainda está sem resposta nossa?',
  },
  {
    label: 'Oportunidades',
    icon: Gavel,
    text: 'Há oportunidades de expansão, indicação ou elogios para registrar?',
  },
]

/** Etapa 3: o que perguntar e com qual modelo. */
export function ConfigStep({
  draft,
  onChange,
  onRun,
}: {
  draft: Draft
  onChange: (changes: Partial<Draft>) => void
  onRun: () => void
}) {
  const { data: prompts } = useQuery({ queryKey: ['prompts'], queryFn: fetchPrompts })
  const presets = usePresets()
  // Sem escolha na tela, vale o preset padrão da pessoa.
  const [chosen, setChosen] = useState<string | null>(draft.preset || null)
  const preset = chosen ?? presets.data?.default_preset ?? ''
  const ready = Boolean(preset) && Boolean(draft.promptId || draft.text.trim())
  const run = () => {
    if (!ready) return
    const label = presets.data?.presets.find((item) => item.id === preset)?.label ?? preset
    onChange({ preset, presetLabel: label })
    onRun()
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        title="O que você quer saber?"
        text="Escolha um atalho, um prompt salvo ou escreva a pergunta."
      />
      <div
        className="fx-stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
        role="group"
        aria-label="Sugestões de pergunta"
      >
        {QUICK_PROMPTS.map((quick) => {
          const active = !draft.promptId && draft.text === quick.text
          return (
            <button
              key={quick.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ promptId: '', promptTitle: quick.label, text: quick.text })}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-1',
                active
                  ? 'border-primary bg-primary/10 shadow-[0_0_24px_-8px_var(--neon-1)]'
                  : 'border-border bg-card hover:border-primary/40',
              )}
            >
              <quick.icon className="size-6 text-primary-ink" aria-hidden />
              <span className="font-semibold">{quick.label}</span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{quick.text}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4">
        <Card className="flex flex-col gap-3 p-4">
          {prompts && prompts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <BookmarkCheck className="size-3.5" aria-hidden /> Prompts salvos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    aria-pressed={draft.promptId === prompt.id}
                    onClick={() =>
                      onChange(
                        draft.promptId === prompt.id
                          ? { promptId: '', promptTitle: '' }
                          : { promptId: prompt.id, promptTitle: prompt.title },
                      )
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-all',
                      draft.promptId === prompt.id
                        ? 'border-primary bg-primary/15 text-primary-ink'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    {prompt.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          {draft.promptId ? (
            <p className="rounded-md border border-dashed border-primary/40 p-3 text-sm whitespace-pre-wrap">
              {prompts?.find((prompt) => prompt.id === draft.promptId)?.body}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prompt-text">Prompt</Label>
              <Textarea
                id="prompt-text"
                value={draft.text}
                placeholder="Ex.: o que ficou combinado e quem faz o quê?"
                onChange={(event) =>
                  onChange({ text: event.target.value, promptTitle: 'Pergunta livre' })
                }
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') run()
                }}
                className="min-h-32 text-base"
              />
            </div>
          )}
        </Card>
        <Card className="flex flex-col gap-2 p-4">
          <p className="text-sm font-medium">Modelo do agente analista</p>
          <PresetPicker value={preset} onChange={setChosen} />
          <p className="text-xs text-muted-foreground">
            O agente extrator usa sempre o perfil Rápido; o analista usa o perfil escolhido.
          </p>
        </Card>
      </div>

      <StepFooter
        info="⌘+Enter na pergunta também executa"
        action={
          <Button size="lg" onClick={run} disabled={!ready}>
            <Play className="size-4" aria-hidden />
            Executar análise
          </Button>
        }
      />
    </div>
  )
}
