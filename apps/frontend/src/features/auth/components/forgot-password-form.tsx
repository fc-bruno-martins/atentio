'use client'

import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import type { FormEvent } from 'react'
import { AuthShell } from '@/components/brand/AuthShell'
import { Button } from '@/components/ui/button'
import { Field, FormError } from '@/components/ui/field'
import { requestRecovery } from '../services/auth'

export function ForgotPasswordForm() {
  const mutation = useMutation({ mutationFn: requestRecovery })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate(String(new FormData(event.currentTarget).get('email')))
  }

  return (
    <AuthShell title="Recuperar acesso" subtitle="Enviaremos um link para o seu e-mail">
      {mutation.isSuccess ? (
        <p role="status" className="text-center text-sm">
          Se o e-mail estiver cadastrado, enviaremos um link.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field id="email" label="E-mail" type="email" autoComplete="email" required />
          <FormError message={mutation.error?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            Enviar link
          </Button>
        </form>
      )}
      <Link href="/login" className="text-center text-sm text-primary-ink">
        Voltar ao login
      </Link>
    </AuthShell>
  )
}
