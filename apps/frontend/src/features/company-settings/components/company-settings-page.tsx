'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { type FormEvent } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchCompanySettings, saveRetention } from '../services/company-settings'

const QUERY_KEY = ['company-settings']

export function CompanySettingsPage() {
  const queryClient = useQueryClient()
  const { data, error } = useQuery({ queryKey: QUERY_KEY, queryFn: fetchCompanySettings })
  const mutation = useMutation({
    mutationFn: saveRetention,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
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
        <Card className="p-4">
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="days">Dias de retenção das mensagens</Label>
              <Input
                id="days"
                name="days"
                type="number"
                min={1}
                max={365}
                required
                defaultValue={data.retention_days}
              />
              <p className="text-sm text-muted-foreground">
                Mensagens e análises mais antigas que isso são apagadas sem possibilidade de
                recuperação. Reduzir o prazo apaga o que já passou dele.
              </p>
            </div>
            <FormError message={mutation.error?.message} />
            {mutation.isSuccess && <p className="text-sm text-success">Prazo salvo.</p>}
            <Button type="submit" disabled={mutation.isPending}>
              Salvar
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
