'use client'

import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FormError } from '@/components/ui/field'
import { formatDate } from '@/features/shared'
import { fetchAnalyses } from '../services/analyses'

export function AnalysesPage() {
  const { data, error } = useQuery({ queryKey: ['analyses'], queryFn: fetchAnalyses })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader
        title="Análises"
        subtitle="Histórico das suas análises. Elas expiram junto com as mensagens."
        icon={Sparkles}
      />
      <FormError message={error?.message} />
      {data?.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="Nenhuma análise ainda"
          subtitle="Abra uma conversa em Conversas para analisar."
        />
      )}
      {data?.map((analysis) => (
        <Card key={analysis.id} className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {formatDate(analysis.created_at)} · {analysis.message_count} mensagens ·{' '}
              {analysis.model}
            </p>
            {analysis.status === 'failed' && <Badge variant="destructive">Falhou</Badge>}
          </div>
          <p className="text-sm font-medium">{analysis.prompt_text}</p>
          {analysis.result && <p className="whitespace-pre-wrap text-sm">{analysis.result}</p>}
        </Card>
      ))}
    </div>
  )
}
