'use client'

import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import type { FormEvent } from 'react'
import { AuthShell } from '@/components/brand/AuthShell'
import { Button } from '@/components/ui/button'
import { Field, FormError } from '@/components/ui/field'
import { PasswordField } from '@/components/ui/password-field'
import { homeFor } from '@/features/shared'
import { login } from '../services/auth'

export function LoginForm() {
  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: ({ user }) => window.location.assign(homeFor(user.role)),
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    mutation.mutate({
      email: String(form.get('email')),
      password: String(form.get('password')),
    })
  }

  return (
    <AuthShell title="Entrar" subtitle="Use seu e-mail e senha">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field id="email" label="E-mail" type="email" autoComplete="email" required />
        <PasswordField id="password" label="Senha"
          autoComplete="current-password"
          required
        />
        <FormError message={mutation.error?.message} />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
        <Link href="/esqueci-senha" className="text-center text-sm text-primary-ink">
          Esqueci minha senha
        </Link>
      </form>
    </AuthShell>
  )
}
