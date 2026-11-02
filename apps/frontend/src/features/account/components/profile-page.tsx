'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserRound } from 'lucide-react'
import type { FormEvent } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FormError } from '@/components/ui/field'
import { useCurrentUser } from '@/features/shared'
import { changePassword, updateName } from '../services/account'

export function ProfilePage() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()
  const name = useMutation({
    mutationFn: updateName,
    onSuccess: (updated) => queryClient.setQueryData(['me'], updated),
  })
  const password = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      changePassword(current, next),
  })

  if (!user) return null

  const submitName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    name.mutate(String(new FormData(event.currentTarget).get('name')))
  }

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const element = event.currentTarget
    const form = new FormData(element)
    password.mutate(
      { current: String(form.get('current')), next: String(form.get('next')) },
      { onSuccess: () => element.reset() },
    )
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <PageHeader title="Meu perfil" subtitle={user.email} icon={UserRound} />
      <Card className="p-4">
        <form onSubmit={submitName} className="flex flex-col gap-4">
          <Field id="name" label="Nome" defaultValue={user.name} required minLength={2} />
          <FormError message={name.error?.message} />
          {name.isSuccess && <p role="status" className="text-sm">Nome atualizado.</p>}
          <Button type="submit" disabled={name.isPending}>
            Salvar nome
          </Button>
        </form>
      </Card>
      <Card className="p-4">
        <form onSubmit={submitPassword} className="flex flex-col gap-4">
          <Field
            id="current"
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            required
          />
          <Field
            id="next"
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
          <FormError message={password.error?.message} />
          {password.isSuccess && <p role="status" className="text-sm">Senha alterada.</p>}
          <Button type="submit" disabled={password.isPending}>
            Alterar senha
          </Button>
        </form>
      </Card>
    </div>
  )
}
