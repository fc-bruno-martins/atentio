import {
  Activity,
  Building2,
  ClipboardList,
  MessagesSquare,
  MonitorSmartphone,
  Settings,
  Smartphone,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import type { NavItem } from '@/components/layout/AppShell'
import type { Role } from '../types'

const PROFILE: NavItem = { href: '/perfil', label: 'Meu perfil', icon: UserRound }

const NUMBERS: NavItem = { href: '/numeros', label: 'Números', icon: Smartphone }

const CONVERSATIONS: NavItem = { href: '/conversas', label: 'Conversas', icon: MessagesSquare }

const ANALYSES: NavItem = { href: '/analises', label: 'Análises', icon: Sparkles }
const PROMPTS: NavItem = { href: '/prompts', label: 'Prompts', icon: ClipboardList }

const MENUS: Record<Role, NavItem[]> = {
  platform_admin: [
    { href: '/empresas', label: 'Empresas', icon: Building2 },
    { href: '/status', label: 'Status', icon: Activity },
    PROFILE,
  ],
  company_admin: [
    { href: '/usuarios', label: 'Usuários', icon: Users },
    { href: '/numeros-da-empresa', label: 'Números da empresa', icon: MonitorSmartphone },
    { href: '/parametros', label: 'Parâmetros', icon: Settings },
    CONVERSATIONS,
    ANALYSES,
    PROMPTS,
    NUMBERS,
    PROFILE,
  ],
  user: [CONVERSATIONS, ANALYSES, PROMPTS, NUMBERS, PROFILE],
}

export const menuFor = (role: Role): NavItem[] => MENUS[role]
export const homeFor = (role: Role): string => menuFor(role)[0]?.href ?? '/perfil'
