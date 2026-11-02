import { Activity, Building2, UserRound, Users } from 'lucide-react'
import type { NavItem } from '@/components/layout/AppShell'
import type { Role } from '../types'

const PROFILE: NavItem = { href: '/perfil', label: 'Meu perfil', icon: UserRound }

const MENUS: Record<Role, NavItem[]> = {
  platform_admin: [
    { href: '/empresas', label: 'Empresas', icon: Building2 },
    { href: '/status', label: 'Status', icon: Activity },
    PROFILE,
  ],
  company_admin: [{ href: '/usuarios', label: 'Usuários', icon: Users }, PROFILE],
  user: [PROFILE],
}

export const menuFor = (role: Role): NavItem[] => MENUS[role]
export const homeFor = (role: Role): string => menuFor(role)[0]?.href ?? '/perfil'
