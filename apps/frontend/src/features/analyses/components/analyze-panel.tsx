'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { ModelInput, useModels } from '@/features/shared'
import { fetchPrompts, runAnalysis } from '../services/analyses'

const textareaClass = 'min-h-20 w-full rounded-md border border-input bg-background p-2 text-sm'

function scopeLabel(selected: number, hasPeriod: boolean): string {
  if (selected === 1) return '1 mensagem selecionada'
  if (selected > 1) return `${selected} mensagens selecionadas`
  return hasPeriod ? 'Mensagens do período' : 'Últimas 500 mensagens da conversa'
}

export function AnalyzePanel({
  conversationId,
  period,
  selectedIds,
}: {
  conversationId: string
  period: { since?: string; until?: string }
  selectedIds: string[]
}) {
  const queryClient = useQueryClient()
  const [promptId, setPromptId] = useState('')
  const [text, setText] = useState('')
  const [chosenModel, setChosenModel] = useState<string | null>(null)
  const models = useModels()
  const model = chosenModel ?? models.data?.default_model ?? ''
  const { data: prompts } = useQuery({ queryKey: ['prompts'], queryFn: fetchPrompts })
  const mutation = useMutation({
    mutationFn: () =>
      runAnalysis({
        conversation_id: conversationId,
        model,
        ...(promptId ? { prompt_id: promptId } : { prompt_text: text }),
        ...(selectedIds.length > 0 ? { message_ids: selectedIds } : period),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analyses'] }),
  })
  const result = mutation.data

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">
        {scopeLabel(selectedIds.length, Boolean(period.since ?? period.until))}
      </p>
      {prompts && prompts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="saved-prompt">Prompt salvo</Label>
          <select
            id="saved-prompt"
            value={promptId}
            onChange={(event) => setPromptId(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Escrever agora</option>
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.title}
              </option>
            ))}
          </select>
        </div>
      )}
      {!promptId && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prompt-text">Prompt</Label>
          <textarea
            id="prompt-text"
            className={textareaClass}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="analysis-model">Modelo</Label>
        <ModelInput
          id="analysis-model"
          value={model}
          onChange={(event) => setChosenModel(event.target.value)}
        />
      </div>
      <FormError message={mutation.error?.message ?? models.error?.message} />
      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !model || (!promptId && !text.trim())}
      >
        <Sparkles className="size-4" aria-hidden />
        {mutation.isPending ? 'Analisando…' : 'Analisar'}
      </Button>
      {result?.status === 'failed' && (
        <FormError message="O provedor não respondeu. Tente novamente." />
      )}
      {result?.result && (
        <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{result.result}</p>
      )}
    </section>
  )
}
