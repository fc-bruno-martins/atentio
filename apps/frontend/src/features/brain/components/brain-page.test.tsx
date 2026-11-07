import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { BrainPage, findings } from './brain-page'

const conversation = {
  id: 'c1',
  connection_id: 'n1',
  channel: 'whatsapp',
  kind: 'group',
  name: 'Diretoria',
  contact: '123',
  last_message_at: '2026-11-02T12:00:00Z',
}
const analysis = {
  id: 'a1',
  conversation_id: 'c1',
  prompt_text: 'Resuma',
  model: 'modelo/x',
  status: 'done',
  result: '## Decisões\n- Aprovar orçamento\n\n## Pendências\n- [ ] Enviar contrato\n- [ ] Ligar',
  message_count: 30,
  created_at: '2026-11-02T12:00:00Z',
}

afterEach(() => vi.unstubAllGlobals())

function api() {
  return mockApi({
    'GET /api/v1/overview': {
      body: {
        total_messages: 1234,
        last_24h: 56,
        from_me: 10,
        people: 7,
        by_day: [],
        conversations: [{ conversation_id: 'c1', messages: 900, last_24h: 12 }],
      },
    },
    'GET /api/v1/conversations': { body: [conversation] },
    'GET /api/v1/connections': {
      body: [{ id: 'n1', channel: 'whatsapp', account: '5511', status: 'connected', status_changed_at: '2026-11-02T12:00:00Z', confirmed: true, disconnect_reason: null }],
    },
    'GET /api/v1/analyses': { body: [analysis] },
  })
}

it('mostra os indicadores da captura e dos agentes', async () => {
  api()
  renderWithQuery(<BrainPage />)
  expect(await screen.findByText('1.234')).toBeInTheDocument()
  expect(screen.getByText(/\+56 nas/)).toBeInTheDocument()
  expect(screen.getByText('Pendências encontradas')).toBeInTheDocument()
  expect(screen.getByText('Atividade do agente')).toBeInTheDocument()
})

it('desenha as conversas no grafo e abre os detalhes ao clicar', async () => {
  const calls = api()
  renderWithQuery(<BrainPage />)
  const graph = await screen.findByRole('img', { name: /1 conectores e 1 conversas/ })
  await userEvent.click(within(graph).getByRole('button', { name: 'Diretoria: 900 mensagens' }))
  expect(await screen.findByRole('link', { name: 'Analisar' })).toHaveAttribute(
    'href',
    '/analises?conversa=c1',
  )
  expect(calls.find((c) => c.key === 'GET /api/v1/overview')).toBeDefined()
})

it('conta pendências e decisões das análises', () => {
  expect(findings([analysis as never])).toEqual({ tasks: 2, decisions: 1 })
})
