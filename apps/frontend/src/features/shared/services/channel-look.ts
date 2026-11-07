import type { ComponentType, SVGProps } from 'react'
import {
  AzureDevOpsIcon,
  ClickUpIcon,
  DiscordIcon,
  GenericConnectorIcon,
  JiraIcon,
  NotionIcon,
  SlackIcon,
  TeamsIcon,
  WhatsAppIcon,
} from '../components/connector-icons'

export interface ChannelLook {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Cor da marca, usada em grafos e destaques. */
  color: string
  description: string
}

const LOOKS: Record<string, ChannelLook> = {
  whatsapp: {
    icon: WhatsAppIcon,
    color: '#25D366',
    description: 'Grupos e conversas do seu número de celular.',
  },
  slack: {
    icon: SlackIcon,
    color: '#E01E5A',
    description: 'Canais, mensagens diretas e menções do seu workspace.',
  },
  teams: {
    icon: TeamsIcon,
    color: '#5B5FC7',
    description: 'Chats, canais e reuniões das equipes.',
  },
  discord: {
    icon: DiscordIcon,
    color: '#5865F2',
    description: 'Servidores, canais e mensagens diretas da comunidade.',
  },
  clickup: {
    icon: ClickUpIcon,
    color: '#7B68EE',
    description: 'Comentários e menções nas tarefas dos projetos.',
  },
}

const FALLBACK: ChannelLook = {
  icon: GenericConnectorIcon,
  color: '#22d3ee',
  description: '',
}

/** Identidade visual de cada conector, usada em Conectores, Cérebro e análises. */
export const channelLook = (channel: string): ChannelLook => LOOKS[channel] ?? FALLBACK

const OUTPUT_LOOKS: Record<string, ChannelLook> = {
  notion: { icon: NotionIcon, color: '#e5e5e5', description: '' },
  jira: { icon: JiraIcon, color: '#2684FF', description: '' },
  clickup: { icon: ClickUpIcon, color: '#7B68EE', description: '' },
  azure_devops: { icon: AzureDevOpsIcon, color: '#0078D4', description: '' },
  whatsapp: { icon: WhatsAppIcon, color: '#25D366', description: '' },
}

/** Ícone e cor de um conector de saída (destino da publicação). */
export const outputLook = (output: string): ChannelLook => OUTPUT_LOOKS[output] ?? FALLBACK
