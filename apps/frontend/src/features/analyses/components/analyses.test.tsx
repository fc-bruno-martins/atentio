import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { AnalysesPage } from './analyses-page'
import { AnalyzePanel } from './analyze-panel'
import { PromptsPage } from './prompts-page'

const PROMPTS = 'GET /api/v1/analysis-prompts'
const RUN = 'POST /api/v1/analyses'
const MODELS = 'GET /api/v1/analysis-models'
const CATALOG = {
  models: [{ id: 'modelo/x', name: 'Modelo X', input_price: 1, output_price: 2 }],
  default_model: 'modelo/x',
}
const prompt = { id: 'p1', title: 'Pendências', body: 'Liste' }
const analysis = {
  id: 'a1',
  conversation_id: 'c1',
  prompt_text: 'Resuma',
  model: 'modelo/x',
  status: 'done',
  result: 'Tudo certo',
  message_count: 3,
  created_at: '2026-11-02T12:00:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it('usa o período quando nada está selecionado', async () => {
  const calls = mockApi({ [PROMPTS]: { body: [] }, [MODELS]: { body: CATALOG }, [RUN]: { status: 201, body: analysis } })
  renderWithQuery(
    <AnalyzePanel conversationId="c1" period={{ since: '2026-11-01T03:00:00Z' }} selectedIds={[]} />,
  )
  expect(screen.getByText('Mensagens do período')).toBeInTheDocument()
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await waitFor(() => expect(screen.getByLabelText('Modelo')).toHaveValue('modelo/x'))
  await userEvent.click(screen.getByRole('button', { name: 'Analisar' }))
  await screen.findByText('Tudo certo')
  expect(calls.find((c) => c.key === RUN)?.body).toMatchObject({
    model: 'modelo/x',
    since: '2026-11-01T03:00:00Z',
    prompt_text: 'Resuma',
  })
})

it('usa prompt salvo', async () => {
  const calls = mockApi({
    [PROMPTS]: { body: [prompt] },
    [MODELS]: { body: CATALOG },
    [RUN]: { status: 201, body: analysis },
  })
  renderWithQuery(<AnalyzePanel conversationId="c1" period={{}} selectedIds={['m1', 'm2']} />)
  expect(screen.getByText('2 mensagens selecionadas')).toBeInTheDocument()
  await userEvent.selectOptions(await screen.findByLabelText('Prompt salvo'), 'p1')
  await waitFor(() => expect(screen.getByLabelText('Modelo')).toHaveValue('modelo/x'))
  await userEvent.click(screen.getByRole('button', { name: 'Analisar' }))
  await screen.findByText('Tudo certo')
  expect(calls.find((c) => c.key === RUN)?.body).toMatchObject({
    prompt_id: 'p1',
    message_ids: ['m1', 'm2'],
  })
})

it('sem prompt não permite analisar', () => {
  mockApi({ [PROMPTS]: { body: [] }, [MODELS]: { body: CATALOG } })
  renderWithQuery(<AnalyzePanel conversationId="c1" period={{}} selectedIds={[]} />)
  expect(screen.getByRole('button', { name: 'Analisar' })).toBeDisabled()
})

it('informa quando as análises não estão configuradas', async () => {
  const message = 'As análises ainda não foram configuradas nesta plataforma.'
  mockApi({
    [PROMPTS]: { body: [] },
    [MODELS]: { body: CATALOG },
    [RUN]: { status: 503, body: { code: 'analysis_not_configured', message } },
  })
  renderWithQuery(<AnalyzePanel conversationId="c1" period={{}} selectedIds={[]} />)
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await waitFor(() => expect(screen.getByLabelText('Modelo')).toHaveValue('modelo/x'))
  await userEvent.click(screen.getByRole('button', { name: 'Analisar' }))
  expect(await screen.findByText(message)).toBeInTheDocument()
})

it('mostra falha do provedor', async () => {
  mockApi({
    [PROMPTS]: { body: [] },
    [MODELS]: { body: CATALOG },
    [RUN]: { status: 201, body: { ...analysis, status: 'failed', result: null } },
  })
  renderWithQuery(<AnalyzePanel conversationId="c1" period={{}} selectedIds={[]} />)
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await waitFor(() => expect(screen.getByLabelText('Modelo')).toHaveValue('modelo/x'))
  await userEvent.click(screen.getByRole('button', { name: 'Analisar' }))
  expect(await screen.findByText(/provedor não respondeu/)).toBeInTheDocument()
})

it('lista o histórico', async () => {
  mockApi({ 'GET /api/v1/analyses': { body: [analysis] } })
  renderWithQuery(<AnalysesPage />)
  expect(await screen.findByText('Tudo certo')).toBeInTheDocument()
})

it('cria e exclui prompts', async () => {
  const calls = mockApi({
    [PROMPTS]: { body: [prompt] },
    'POST /api/v1/analysis-prompts': { status: 201, body: prompt },
    'DELETE /api/v1/analysis-prompts/p1': { status: 204 },
  })
  renderWithQuery(<PromptsPage />)
  await userEvent.type(screen.getByLabelText(/Título/), 'Novo')
  await userEvent.type(screen.getByLabelText('Prompt'), 'Texto')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar prompt' }))
  await waitFor(() =>
    expect(calls.find((c) => c.key === 'POST /api/v1/analysis-prompts')?.body).toEqual({
      title: 'Novo',
      body: 'Texto',
    }),
  )
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
  await waitFor(() =>
    expect(calls.some((c) => c.key === 'DELETE /api/v1/analysis-prompts/p1')).toBe(true),
  )
})

it('deixa escolher outro modelo e oferece os do catálogo com preço', async () => {
  const calls = mockApi({
    [PROMPTS]: { body: [] },
    [MODELS]: { body: CATALOG },
    [RUN]: { status: 201, body: analysis },
  })
  const { container } = renderWithQuery(
    <AnalyzePanel conversationId="c1" period={{}} selectedIds={[]} />,
  )
  const input = screen.getByLabelText('Modelo')
  await waitFor(() => expect(input).toHaveValue('modelo/x'))
  await waitFor(() =>
    expect(container.querySelector('option[value="modelo/x"]')?.getAttribute('label')).toBe(
      'Modelo X · US$ 1 / US$ 2 por 1M de tokens',
    ),
  )
  await userEvent.clear(input)
  await userEvent.type(input, 'modelo/z')
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await userEvent.click(screen.getByRole('button', { name: 'Analisar' }))
  await screen.findByText('Tudo certo')
  expect(calls.find((c) => c.key === RUN)?.body).toMatchObject({ model: 'modelo/z' })
})

it('sem modelo não permite analisar', async () => {
  mockApi({ [PROMPTS]: { body: [] }, [MODELS]: { body: { models: [], default_model: null } } })
  renderWithQuery(<AnalyzePanel conversationId="c1" period={{}} selectedIds={[]} />)
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  expect(screen.getByRole('button', { name: 'Analisar' })).toBeDisabled()
})
