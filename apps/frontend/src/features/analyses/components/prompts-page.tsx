'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { type FormEvent } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FormError } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { createPrompt, deletePrompt, fetchPrompts } from '../services/analyses'

const QUERY_KEY = ['prompts']

export function PromptsPage() {
  const queryClient = useQueryClient()
  const { data, error } = useQuery({ queryKey: QUERY_KEY, queryFn: fetchPrompts })
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  const create = useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) => createPrompt(title, body),
    onSuccess: refresh,
  })
  const remove = useMutation({ mutationFn: deletePrompt, onSuccess: refresh })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    create.mutate(
      { title: String(values.get('title')), body: String(values.get('body')) },
      { onSuccess: () => form.reset() },
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title="Prompts" subtitle="Seus prompts de análise." icon={ClipboardList} />
      <Card className="p-4">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field id="title" label="Título" required />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">Prompt</Label>
            <textarea
              id="body"
              name="body"
              required
              className="min-h-24 rounded-md border border-input bg-background p-2 text-sm"
            />
          </div>
          <FormError message={create.error?.message ?? error?.message} />
          <Button type="submit" disabled={create.isPending}>
            Salvar prompt
          </Button>
        </form>
      </Card>
      {data?.length === 0 && <EmptyState icon={ClipboardList} title="Nenhum prompt salvo" />}
      {data?.map((prompt) => (
        <Card key={prompt.id} className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="font-medium">{prompt.title}</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{prompt.body}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => remove.mutate(prompt.id)}>
            Excluir
          </Button>
        </Card>
      ))}
    </div>
  )
}
