'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FormError } from '@/components/ui/field'
import { formatDate } from '@/features/shared'
import { createMcpToken, fetchMcpTokens, revokeMcpToken } from '../services/account'

const QUERY_KEY = ['mcp-tokens']

function connectCommand(token: string): string {
  return `claude mcp add --transport http judite http://localhost:8101/mcp --header "Authorization: Bearer ${token}"`
}

export function McpTokens() {
  const queryClient = useQueryClient()
  const [created, setCreated] = useState<string | null>(null)
  const { data, error } = useQuery({ queryKey: QUERY_KEY, queryFn: fetchMcpTokens })
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  const create = useMutation({
    mutationFn: createMcpToken,
    onSuccess: async (token) => {
      setCreated(token.token)
      await refresh()
    },
  })
  const revoke = useMutation({ mutationFn: revokeMcpToken, onSuccess: refresh })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    create.mutate(String(new FormData(form).get('token-name')), {
      onSuccess: () => form.reset(),
    })
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="font-semibold">Conectar ao Claude</h2>
        <p className="text-sm text-muted-foreground">
          O token dá ao Claude acesso de leitura às suas conversas capturadas. Trate-o como uma
          senha: o conteúdo lido é enviado à Anthropic.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field id="token-name" label="Nome do token" placeholder="Claude Code" required />
        <FormError message={create.error?.message ?? error?.message} />
        <Button type="submit" disabled={create.isPending}>
          Gerar token
        </Button>
      </form>
      {created && (
        <div className="flex flex-col gap-2 rounded-md bg-warning/10 p-3 text-sm">
          <p className="font-medium">Copie agora. Este token não será mostrado de novo.</p>
          <code className="break-all">{created}</code>
          <p>Para conectar no Claude Code, rode no terminal:</p>
          <code className="break-all">{connectCommand(created)}</code>
        </div>
      )}
      {data && data.length > 0 && (
        <ul className="divide-y divide-border">
          {data.map((token) => (
            <li key={token.id} className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-sm font-medium">{token.name}</p>
                <p className="text-xs text-muted-foreground">
                  {token.last_used_at
                    ? `Último uso em ${formatDate(token.last_used_at)}`
                    : 'Ainda não usado'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => revoke.mutate(token.id)}>
                Revogar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
