import { describe, expect, it } from 'vitest'
import { homeFor, menuFor } from './nav'

const labels = (role: Parameters<typeof menuFor>[0]) => menuFor(role).map((item) => item.label)

describe('menu por perfil', () => {
  it('mostra pitch e canvas primeiro e depois só os itens de cada perfil', () => {
    expect(labels('platform_admin')).toEqual([
      'Pitch',
      'Business Model Canvas',
      'Empresas',
      'Status',
      'Meu perfil',
    ])
    expect(labels('company_admin')).toEqual([
      'Pitch',
      'Business Model Canvas',
      'Cérebro',
      'Usuários',
      'Conectores da empresa',
      'Parâmetros',
      'Conversas',
      'Análises',
      'Prompts',
      'Conectores',
      'Meu perfil',
    ])
    expect(labels('user')).toEqual([
      'Pitch',
      'Business Model Canvas',
      'Cérebro',
      'Conversas',
      'Análises',
      'Prompts',
      'Conectores',
      'Meu perfil',
    ])
  })

  it('separa a apresentação dos menus do sistema', () => {
    for (const role of ['platform_admin', 'company_admin', 'user'] as const) {
      const separated = menuFor(role).filter((item) => item.separatorBefore)
      expect(separated).toHaveLength(1)
      expect(menuFor(role)[2]?.separatorBefore).toBe(true)
    }
  })

  it('define a tela inicial do perfil', () => {
    expect(homeFor('platform_admin')).toBe('/empresas')
    expect(homeFor('company_admin')).toBe('/cerebro')
    expect(homeFor('user')).toBe('/cerebro')
  })
})
