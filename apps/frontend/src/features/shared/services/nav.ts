import {
  Activity,
  BrainCircuit,
  Building2,
  Cable,
  ClipboardList,
  LayoutGrid,
  MessagesSquare,
  Presentation,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import type { NavItem } from '@/components/layout/AppShell'
import type { Role } from '../types'

const BRAIN: NavItem = { href: '/cerebro', label: 'Cérebro', icon: BrainCircuit }

const PROFILE: NavItem = { href: '/perfil', label: 'Meu perfil', icon: UserRound }

const CHANNELS: NavItem = { href: '/canais', label: 'Conectores', icon: Cable }

const CONVERSATIONS: NavItem = { href: '/conversas', label: 'Conversas', icon: MessagesSquare }

const ANALYSES: NavItem = { href: '/analises', label: 'Análises', icon: Sparkles }
const PROMPTS: NavItem = { href: '/prompts', label: 'Prompts', icon: ClipboardList }

// Apresentação do negócio: no topo do menu de todos os perfis, antes do sistema.
const BUSINESS: NavItem[] = [
  { href: '/pitch', label: 'Pitch', icon: Presentation },
  { href: '/bmc', label: 'Business Model Canvas', icon: LayoutGrid },
]

const MENUS: Record<Role, NavItem[]> = {
  platform_admin: [
    { href: '/empresas', label: 'Empresas', icon: Building2 },
    { href: '/status', label: 'Status', icon: Activity },
    PROFILE,
  ],
  company_admin: [
    BRAIN,
    { href: '/usuarios', label: 'Usuários', icon: Users },
    { href: '/canais-da-empresa', label: 'Conectores da empresa', icon: Cable },
    { href: '/parametros', label: 'Parâmetros', icon: Settings },
    CONVERSATIONS,
    ANALYSES,
    PROMPTS,
    CHANNELS,
    PROFILE,
  ],
  user: [BRAIN, CONVERSATIONS, ANALYSES, PROMPTS, CHANNELS, PROFILE],
}

export const menuFor = (role: Role): NavItem[] => {
  const [first, ...rest] = MENUS[role]
  return first ? [...BUSINESS, { ...first, separatorBefore: true }, ...rest] : BUSINESS
}
// A tela inicial é a primeira do sistema, não a apresentação.
export const homeFor = (role: Role): string => MENUS[role][0]?.href ?? '/perfil'
