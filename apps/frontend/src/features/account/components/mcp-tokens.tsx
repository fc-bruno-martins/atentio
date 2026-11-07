'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Check, Copy, KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FormError } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/features/shared'
import { createMcpToken, fetchMcpTokens, revokeMcpToken } from '../services/account'

const QUERY_KEY = ['mcp-tokens']

function connectCommand(token: string): string {
  return `claude mcp add --transport http atentio http://localhost:8101/mcp --header "Authorization: Bearer ${token}"`
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const notify = useToast()
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-start gap-2 rounded-md border border-border bg-background/60 p-2">
        <code className="min-w-0 flex-1 font-mono text-xs break-all">{value}</code>
        <button
          type="button"
          aria-label={`Copiar ${label.toLowerCase()}`}
          className="shrink-0 text-muted-foreground transition-colors hover:text-primary-ink"
          onClick={() =>
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true)
              notify('Copiado.')
              setTimeout(() => setCopied(false), 1500)
            })
          }
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  )
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
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#d97757] to-[#8b5cf6] text-white">
          <Bot className="size-5" aria-hidden />
        </span>
        <div>
        <h2 className="font-semibold">Conectar um assistente de IA</h2>
        <p className="text-sm text-muted-foreground">
          O token dá ao assistente acesso de leitura às suas conversas capturadas, pelo protocolo
          MCP. Trate-o como uma senha: o conteúdo lido é enviado ao provedor do assistente.
        </p>
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field id="token-name" label="Nome do token" placeholder="Meu assistente" required />
        <FormError message={create.error?.message ?? error?.message} />
        <Button type="submit" disabled={create.isPending}>
          Gerar token
        </Button>
      </form>
      {created && (
        <div className="fx-enter flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-medium">Copie agora. Este token não será mostrado de novo.</p>
          <CopyBlock label="Token" value={created} />
          <CopyBlock label="Comando para o terminal do assistente" value={connectCommand(created)} />
        </div>
      )}
      {data && data.length > 0 && (
        <ul className="divide-y divide-border">
          {data.map((token) => (
            <li key={token.id} className="flex items-center justify-between gap-4 py-2.5">
              <KeyRound className="size-4 shrink-0 text-primary-ink" aria-hidden />
              <div className="min-w-0 flex-1">
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
