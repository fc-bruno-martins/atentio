'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { AuthShell } from '@/components/brand/AuthShell'
import { Button } from '@/components/ui/button'
import { Field, FormError } from '@/components/ui/field'
import { PasswordField } from '@/components/ui/password-field'
import { acceptInvitation, lookupInvitation } from '../services/invitations'

export function AcceptInvitationForm({ token }: { token: string }) {
  const preview = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => lookupInvitation(token),
    retry: false,
  })
  const mutation = useMutation({
    mutationFn: ({ name, password }: { name: string; password: string }) =>
      acceptInvitation(token, name, password),
    onSuccess: () => window.location.assign('/'),
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    mutation.mutate({ name: String(form.get('name')), password: String(form.get('password')) })
  }

  if (preview.isPending) {
    return <AuthShell title="Convite">Consultando convite…</AuthShell>
  }
  if (!preview.data) {
    return (
      <AuthShell title="Convite inválido">
        <FormError message={preview.error?.message} />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={`Entrar na ${preview.data.company_name}`}
      subtitle={`Crie sua conta para ${preview.data.email}`}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field id="name" label="Nome" autoComplete="name" required minLength={2} />
        <PasswordField id="password" label="Senha" meter
          autoComplete="new-password"
          minLength={12}
          required
        />
        <FormError message={mutation.error?.message} />
        <Button type="submit" disabled={mutation.isPending}>
          Criar conta
        </Button>
      </form>
    </AuthShell>
  )
}
