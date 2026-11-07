'use client'

import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import type { FormEvent } from 'react'
import { AuthShell } from '@/components/brand/AuthShell'
import { Button } from '@/components/ui/button'
import { Field, FormError } from '@/components/ui/field'
import { PasswordField } from '@/components/ui/password-field'
import { resetPassword } from '../services/auth'

export function ResetPasswordForm({ token }: { token: string }) {
  const mutation = useMutation({ mutationFn: (password: string) => resetPassword(token, password) })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate(String(new FormData(event.currentTarget).get('password')))
  }

  return (
    <AuthShell title="Nova senha" subtitle="Use ao menos 12 caracteres">
      {mutation.isSuccess ? (
        <p role="status" className="text-center text-sm">
          Senha alterada. Você já pode entrar.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <PasswordField id="password" label="Nova senha" meter
            autoComplete="new-password"
            minLength={12}
            required
          />
          <FormError message={mutation.error?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            Salvar senha
          </Button>
        </form>
      )}
      <Link href="/login" className="text-center text-sm text-primary-ink">
        Ir para o login
      </Link>
    </AuthShell>
  )
}
