import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { periodParams } from '../services/conversations'
import { ConversationsPage } from './conversations-page'

const LIST = 'GET /api/v1/conversations'
const PROMPTS = 'GET /api/v1/analysis-prompts'
const MODELS = 'GET /api/v1/analysis-models'
const MESSAGES = 'GET /api/v1/conversations/c1/messages'

const direct = {
  id: 'c1',
  number_id: 'n1',
  kind: 'direct',
  name: 'Ana',
  contact: '5511999999999',
  last_message_at: '2026-11-02T12:00:00Z',
}
const group = { ...direct, id: 'c2', kind: 'group', name: null, contact: '123' }
const message = {
  id: 'm1',
  from_me: false,
  sender_name: 'Ana',
  type: 'text',
  text: 'bom dia',
  sent_at: '2026-11-02T12:00:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it('mostra o estado vazio', async () => {
  mockApi({ [LIST]: { body: [] } })
  renderWithQuery(<ConversationsPage />)
  expect(await screen.findByText('Nenhuma conversa capturada')).toBeInTheDocument()
})

it('lista direct e grupo sem nome', async () => {
  mockApi({ [LIST]: { body: [direct, group] } })
  renderWithQuery(<ConversationsPage />)
  expect(await screen.findByText('Ana')).toBeInTheDocument()
  expect(screen.getByText('Grupo sem nome')).toBeInTheDocument()
  expect(screen.getByLabelText('Grupo')).toBeInTheDocument()
})

it('busca pelo nome', async () => {
  mockApi({ [LIST]: { body: [direct, group] } })
  renderWithQuery(<ConversationsPage />)
  await userEvent.type(await screen.findByLabelText('Buscar conversa'), 'ana')
  expect(screen.queryByText('Grupo sem nome')).not.toBeInTheDocument()
})

it('abre a conversa e mostra as mensagens', async () => {
  mockApi({
    [LIST]: { body: [direct] },
    [PROMPTS]: { body: [] },
    [MODELS]: { body: { models: [], default_model: 'modelo/x' } },
    [MESSAGES]: { body: { conversation: direct, messages: [message] } },
  })
  renderWithQuery(<ConversationsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Ana' }))
  expect(await screen.findByText('bom dia')).toBeInTheDocument()
})

it('identifica mídia sem arquivo', async () => {
  const audio = { ...message, type: 'audio', text: null }
  mockApi({
    [LIST]: { body: [direct] },
    [PROMPTS]: { body: [] },
    [MODELS]: { body: { models: [], default_model: 'modelo/x' } },
    [MESSAGES]: { body: { conversation: direct, messages: [audio] } },
  })
  renderWithQuery(<ConversationsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Ana' }))
  expect(await screen.findByText('Áudio')).toBeInTheDocument()
})

it('filtra pelo dia de hoje', async () => {
  const calls = mockApi({
    [LIST]: { body: [direct] },
    [PROMPTS]: { body: [] },
    [MODELS]: { body: { models: [], default_model: 'modelo/x' } },
    [MESSAGES]: { body: { conversation: direct, messages: [] } },
  })
  const fn = vi.mocked(fetch)
  renderWithQuery(<ConversationsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Ana' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Hoje' }))
  await waitFor(() =>
    expect(fn.mock.calls.some(([path]) => String(path).includes('since='))).toBe(true),
  )
  expect(calls.length).toBeGreaterThan(0)
})

it('o dia final entra inteiro no período', () => {
  const query = new URLSearchParams(periodParams({ from: '2026-11-01', to: '2026-11-01' }))
  const since = new Date(query.get('since') ?? '')
  const until = new Date(query.get('until') ?? '')
  expect(until.getTime() - since.getTime()).toBe(24 * 60 * 60 * 1000)
})

it('sem período não envia filtro', () => {
  expect(periodParams({ from: '', to: '' })).toBe('')
})

it('analisa só as mensagens selecionadas', async () => {
  const calls = mockApi({
    [LIST]: { body: [direct] },
    [PROMPTS]: { body: [] },
    [MODELS]: { body: { models: [], default_model: 'modelo/x' } },
    [MESSAGES]: { body: { conversation: direct, messages: [message] } },
    'POST /api/v1/analyses': {
      status: 201,
      body: { id: 'a1', status: 'done', result: 'Resumo pronto', message_count: 1 },
    },
  })
  renderWithQuery(<ConversationsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Ana' }))
  await userEvent.click(await screen.findByRole('checkbox'))
  expect(screen.getByText('1 mensagem selecionada')).toBeInTheDocument()
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await userEvent.click(screen.getByRole('button', { name: 'Analisar' }))
  expect(await screen.findByText('Resumo pronto')).toBeInTheDocument()
  const call = calls.find((item) => item.key === 'POST /api/v1/analyses')
  expect(call?.body).toMatchObject({ message_ids: ['m1'], prompt_text: 'Resuma' })
})
