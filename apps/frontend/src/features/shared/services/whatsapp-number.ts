export type DisconnectReason =
  | 'owner'
  | 'company_admin'
  | 'phone'
  | 'account_deactivated'
  | 'company_deactivated'

export interface WhatsAppNumber {
  id: string
  phone: string
  status: 'connected' | 'disconnected'
  status_changed_at: string
  confirmed: boolean
  disconnect_reason: DisconnectReason | null
}

export const REASON_LABELS: Record<DisconnectReason, string> = {
  owner: 'Desconectado por você',
  company_admin: 'Desconectado pelo admin da empresa',
  phone: 'Desconectado no celular ou por queda de conexão',
  account_deactivated: 'Desconectado porque a conta foi desativada',
  company_deactivated: 'Desconectado porque a empresa foi desativada',
}

export const formatPhone = (phone: string) => `+${phone}`

export const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
