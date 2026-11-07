export type DisconnectReason =
  | 'owner'
  | 'company_admin'
  | 'phone'
  | 'account_deactivated'
  | 'company_deactivated'

export interface Connection {
  id: string
  channel: string
  account: string
  status: 'connected' | 'disconnected'
  status_changed_at: string
  confirmed: boolean
  disconnect_reason: DisconnectReason | null
}

export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  slack: 'Slack',
  teams: 'Microsoft Teams',
  discord: 'Discord',
  clickup: 'ClickUp',
}

export const channelLabel = (channel: string) => CHANNEL_LABELS[channel] ?? channel

export const REASON_LABELS: Record<DisconnectReason, string> = {
  owner: 'Desconectado por você',
  company_admin: 'Desconectado pelo admin da empresa',
  phone: 'Desconectado na origem ou por queda de conexão',
  account_deactivated: 'Desconectado porque a conta foi desativada',
  company_deactivated: 'Desconectado porque a empresa foi desativada',
}

/** Cada conector mostra a conta do seu jeito: no WhatsApp, a conta é o telefone. */
export const formatAccount = ({ channel, account }: Pick<Connection, 'channel' | 'account'>) =>
  channel === 'whatsapp' ? `+${account}` : account

export const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
