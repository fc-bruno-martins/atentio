'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, UserRound } from 'lucide-react'
import type { FormEvent } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Initials } from '@/components/ui/initials'
import { Field, FormError } from '@/components/ui/field'
import { PasswordField } from '@/components/ui/password-field'
import { useCurrentUser } from '@/features/shared'
import { changePassword, updateName } from '../services/account'
import { McpTokens } from './mcp-tokens'

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
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader title="Meu perfil" subtitle={user.email} icon={UserRound} />
      <Card className="relative flex items-center gap-4 overflow-hidden p-5">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-primary/15 via-[var(--neon-2)]/10 to-[var(--neon-3)]/15"
        />
        <Initials name={user.name} className="relative size-16 text-xl" />
        <div className="relative min-w-0">
          <p className="truncate text-lg font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {user.company?.name ?? 'Plataforma'} · {user.email}
          </p>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5">
        <form onSubmit={submitName} className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <UserRound className="size-4 text-primary-ink" aria-hidden /> Nome
          </h2>
          <Field id="name" label="Nome" defaultValue={user.name} required minLength={2} />
          <FormError message={name.error?.message} />
          {name.isSuccess && (
            <p role="status" className="fx-enter text-sm text-primary-ink">
              Nome atualizado.
            </p>
          )}
          <Button type="submit" disabled={name.isPending}>
            Salvar nome
          </Button>
        </form>
      </Card>
      <Card className="p-5">
        <form onSubmit={submitPassword} className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <KeyRound className="size-4 text-primary-ink" aria-hidden /> Senha
          </h2>
          <PasswordField id="current" label="Senha atual"
            autoComplete="current-password"
            required
          />
          <PasswordField id="next" label="Nova senha" meter
            autoComplete="new-password"
            minLength={12}
            required
          />
          <FormError message={password.error?.message} />
          {password.isSuccess && (
            <p role="status" className="fx-enter text-sm text-primary-ink">
              Senha alterada.
            </p>
          )}
          <Button type="submit" disabled={password.isPending}>
            Alterar senha
          </Button>
        </form>
      </Card>
      </div>
      {user.role !== 'platform_admin' && <McpTokens />}
    </div>
  )
}
