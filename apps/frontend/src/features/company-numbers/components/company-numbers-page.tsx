'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MonitorSmartphone, Unplug } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { FormError } from '@/components/ui/field'
import { formatDate, formatPhone, NumberStatus } from '@/features/shared'
import {
  disconnectCompanyNumber,
  fetchCompanyNumbers,
  type CompanyNumber,
} from '../services/company-numbers'

const QUERY_KEY = ['company-numbers']
const POLL_INTERVAL_MS = 30_000

function ConfirmDialog({ number, onClose }: { number: CompanyNumber; onClose: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => disconnectCompanyNumber(number.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      onClose()
    },
  })
  return (
    <Dialog open onClose={onClose} title="Desconectar número">
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          Desconectar {formatPhone(number.phone)}, de {number.owner_name}? A pessoa verá que foi
          desconectado pelo admin e precisará ler um novo QR code para voltar.
        </p>
        <FormError message={mutation.error?.message} />
        <Button
          variant="destructive"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          Confirmar desconexão
        </Button>
      </div>
    </Dialog>
  )
}

export function CompanyNumbersPage() {
  const [disconnecting, setDisconnecting] = useState<CompanyNumber | null>(null)
  const { data, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchCompanyNumbers,
    refetchInterval: POLL_INTERVAL_MS,
  })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader
        title="Números da empresa"
        subtitle="Usuários e números conectados. Conversas e mensagens não ficam disponíveis aqui."
        icon={MonitorSmartphone}
      />
      <FormError message={error?.message} />
      {data?.length === 0 && (
        <EmptyState icon={MonitorSmartphone} title="Nenhum número conectado na empresa" />
      )}
      {data && data.length > 0 && (
        <Card>
          <ul className="divide-y divide-border">
            {data.map((number) => (
              <li key={number.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{number.owner_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPhone(number.phone)} · {formatDate(number.status_changed_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <NumberStatus number={number} />
                  {number.status === 'connected' && (
                    <Button variant="outline" size="sm" onClick={() => setDisconnecting(number)}>
                      <Unplug className="size-4" aria-hidden />
                      Desconectar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {disconnecting && (
        <ConfirmDialog number={disconnecting} onClose={() => setDisconnecting(null)} />
      )}
    </div>
  )
}
