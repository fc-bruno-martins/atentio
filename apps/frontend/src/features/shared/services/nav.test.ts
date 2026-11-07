import { describe, expect, it } from 'vitest'
import { homeFor, menuFor } from './nav'

const labels = (role: Parameters<typeof menuFor>[0]) => menuFor(role).map((item) => item.label)

describe('menu por perfil', () => {
  it('mostra só os itens de cada perfil', () => {
    expect(labels('platform_admin')).toEqual(['Empresas', 'Status', 'Meu perfil'])
    expect(labels('company_admin')).toEqual([
      'Usuários',
      'Canais da empresa',
      'Parâmetros',
      'Conversas',
      'Análises',
      'Prompts',
      'Canais',
      'Meu perfil',
    ])
    expect(labels('user')).toEqual(['Conversas', 'Análises', 'Prompts', 'Canais', 'Meu perfil'])
  })

  it('define a tela inicial do perfil', () => {
    expect(homeFor('platform_admin')).toBe('/empresas')
    expect(homeFor('company_admin')).toBe('/usuarios')
    expect(homeFor('user')).toBe('/conversas')
  })
})
