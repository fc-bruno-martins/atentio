'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Hourglass, Settings } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { fetchCompanySettings, saveRetention } from '../services/company-settings'

const QUERY_KEY = ['company-settings']
const PRESETS = [7, 30, 90, 180, 365]

function RetentionForm({
  initial,
  onSubmit,
  pending,
  error,
  saved,
}: {
  initial: number
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  pending: boolean
  error?: string
  saved: boolean
}) {
  const [days, setDays] = useState(initial)
  const [now] = useState(() => Date.now())
  const cutoff = new Date(now - days * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
  const shrinking = days < initial
  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Hourglass className="size-4 text-primary-ink" aria-hidden />
          <h2 className="font-semibold">Retenção das mensagens</h2>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="days">Dias de retenção das mensagens</Label>
            <Input
              id="days"
              name="days"
              type="number"
              min={1}
              max={365}
              required
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="w-28 font-mono text-lg"
            />
          </div>
          <input
            type="range"
            min={1}
            max={365}
            value={days}
            aria-label="Ajustar dias de retenção"
            onChange={(event) => setDays(Number(event.target.value))}
            className="mb-3 flex-1 cursor-pointer accent-[#25e2af]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDays(preset)}
              className={
                preset === days
                  ? 'rounded-full border border-primary bg-primary/15 px-2.5 py-1 text-xs text-primary-ink'
                  : 'rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }
            >
              {preset} dias
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Mensagens e análises mais antigas que isso são apagadas sem possibilidade de recuperação.
          Reduzir o prazo apaga o que já passou dele.
        </p>
        <p
          className={
            shrinking
              ? 'rounded-md border border-warning/40 bg-warning/10 p-2.5 text-sm'
              : 'rounded-md border border-border bg-muted p-2.5 text-sm'
          }
        >
          Hoje, isso mantém o que chegou a partir de <strong>{cutoff}</strong>.
          {shrinking && ' Ao salvar, o que for anterior a essa data será apagado.'}
        </p>
        <FormError message={error} />
        {saved && <p className="text-sm text-success">Prazo salvo.</p>}
        <Button type="submit" disabled={pending}>
          Salvar
        </Button>
      </form>
    </Card>
  )
}

export function CompanySettingsPage() {
  const queryClient = useQueryClient()
  const { data, error } = useQuery({ queryKey: QUERY_KEY, queryFn: fetchCompanySettings })
  const notify = useToast()
  const mutation = useMutation({
    mutationFn: saveRetention,
    onSuccess: async () => {
      notify('Prazo de retenção salvo.')
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate(Number(new FormData(event.currentTarget).get('days')))
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title="Parâmetros" subtitle="Regras da sua empresa." icon={Settings} />
      <FormError message={error?.message} />
      {data && (
        <RetentionForm
          initial={data.retention_days}
          onSubmit={submit}
          pending={mutation.isPending}
          error={mutation.error?.message}
          saved={mutation.isSuccess}
        />
      )}
    </div>
  )
}
