import { Badge } from '@/components/ui/badge'
import type { WhatsAppNumber } from '../services/whatsapp-number'

export function NumberStatus({ number }: { number: WhatsAppNumber }) {
  if (number.status === 'disconnected') return <Badge variant="secondary">Desconectado</Badge>
  if (!number.confirmed) return <Badge variant="warning">Não confirmado</Badge>
  return <Badge variant="success">Conectado</Badge>
}
