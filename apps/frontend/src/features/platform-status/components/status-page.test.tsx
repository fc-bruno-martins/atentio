import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { StatusPage } from './status-page'

const names = ['backend', 'database', 'queue', 'evolution_api', 'workers', 'mcp']
const allUp = {
  healthy: true,
  schema_version: '0002',
  checked_at: '2026-11-02T12:00:00Z',
  components: names.map((component) => ({ component, available: true, detail: null })),
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StatusPage', () => {
  it('lista os seis componentes como disponíveis', async () => {
    mockApi({ 'GET /api/v1/platform/status': { body: allUp } })
    renderWithQuery(<StatusPage />)

    expect(await screen.findByText('Tudo disponível')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByText('Versão do esquema: 0002')).toBeInTheDocument()
  })

  it('marca só o componente indisponível, com o detalhe', async () => {
    mockApi({
      'GET /api/v1/platform/status': {
        body: {
          ...allUp,
          healthy: false,
          components: allUp.components.map((c) =>
            c.component === 'workers'
              ? { ...c, available: false, detail: 'sem heartbeat recente' }
              : c,
          ),
        },
      },
    })
    renderWithQuery(<StatusPage />)

    const item = (await screen.findByText('Workers')).closest('li') as HTMLElement
    expect(within(item).getByText('Indisponível')).toBeInTheDocument()
    expect(within(item).getByText('sem heartbeat recente')).toBeInTheDocument()
    expect(screen.getAllByText('Disponível')).toHaveLength(5)
  })

  it('mostra mensagem quando a API falha', async () => {
    mockApi({ 'GET /api/v1/platform/status': { status: 503 } })
    renderWithQuery(<StatusPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível consultar o estado da plataforma.',
    )
  })
})
