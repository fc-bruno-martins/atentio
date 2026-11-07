'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Copy, Plus, Trash2, Wand2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FormError } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { createPrompt, deletePrompt, fetchPrompts } from '../services/analyses'

const QUERY_KEY = ['prompts']
const MAX_LENGTH = 4000

/** Pontos de partida editáveis; nada é salvo sem a pessoa confirmar. */
const STARTERS = [
  {
    title: 'Check-in semanal do cliente',
    body: 'Resuma a semana com o cliente: saúde do relacionamento, pedidos abertos, compromissos e próximos passos.',
  },
  {
    title: 'Preparar QBR',
    body: 'Levante conquistas, problemas recorrentes, riscos e oportunidades para a reunião de resultados com o cliente.',
  },
  {
    title: 'Passagem de conta',
    body: 'Monte um resumo para quem vai assumir a conta: contexto, pessoas-chave, combinados e pontos sensíveis.',
  },
]

export function PromptsPage() {
  const queryClient = useQueryClient()
  const notify = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const { data, error, isPending } = useQuery({ queryKey: QUERY_KEY, queryFn: fetchPrompts })
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  const create = useMutation({
    mutationFn: () => createPrompt(title, body),
    onSuccess: async () => {
      setTitle('')
      setBody('')
      notify('Prompt salvo.')
      await refresh()
    },
  })
  const remove = useMutation({
    mutationFn: deletePrompt,
    onSuccess: async () => {
      notify('Prompt excluído.')
      await refresh()
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    create.mutate()
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Prompts"
        subtitle="Perguntas prontas para reutilizar nas análises das conversas."
        icon={ClipboardList}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="flex flex-col gap-4 p-5 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-primary-ink" aria-hidden />
            <h2 className="font-semibold">Novo prompt</h2>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wand2 className="size-3.5" aria-hidden /> Começar de um modelo
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STARTERS.map((starter) => (
                <button
                  key={starter.title}
                  type="button"
                  onClick={() => {
                    setTitle(starter.title)
                    setBody(starter.body)
                  }}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
                >
                  {starter.title}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Field
              id="title"
              label="Título"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Prompt</Label>
                <span
                  className={cn(
                    'font-mono text-[10px] tabular-nums text-muted-foreground',
                    body.length > MAX_LENGTH && 'text-destructive',
                  )}
                >
                  {body.length}/{MAX_LENGTH}
                </span>
              </div>
              <Textarea
                id="body"
                name="body"
                required
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="O que a IA deve procurar nas conversas?"
                className="min-h-32"
              />
            </div>
            <FormError message={create.error?.message ?? error?.message} />
            <Button type="submit" disabled={create.isPending || body.length > MAX_LENGTH}>
              Salvar prompt
            </Button>
          </form>
        </Card>

        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {data?.length ?? 0} prompts salvos
          </p>
          {isPending && [0, 1].map((index) => <div key={index} className="feat-skeleton h-24 rounded-xl" />)}
          {data?.length === 0 && (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum prompt salvo"
              subtitle="Salve as perguntas que você faz sempre e escolha-as ao analisar."
            />
          )}
          <div className="fx-stagger flex flex-col gap-3">
            {data?.map((prompt) => (
              <Card key={prompt.id} className="group flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{prompt.title}</p>
                  <div className="flex gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Copiar ${prompt.title}`}
                      onClick={() =>
                        void navigator.clipboard
                          ?.writeText(prompt.body)
                          .then(() => notify('Prompt copiado.'))
                      }
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs hover:text-destructive"
                      onClick={() => remove.mutate(prompt.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      Excluir
                    </Button>
                  </div>
                </div>
                <p className="line-clamp-4 text-sm whitespace-pre-wrap text-muted-foreground">
                  {prompt.body}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
