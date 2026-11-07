import { Badge } from '@/components/ui/badge'
import type { Connection } from '../services/connection'

export function ConnectionStatus({ connection }: { connection: Connection }) {
  if (connection.status === 'disconnected') return <Badge variant="secondary">Desconectado</Badge>
  if (!connection.confirmed) return <Badge variant="warning">Não confirmado</Badge>
  return (
    <Badge variant="success" className="gap-1.5">
      <span className="fx-live-dot !size-1.5" aria-hidden />
      Conectado
    </Badge>
  )
}
