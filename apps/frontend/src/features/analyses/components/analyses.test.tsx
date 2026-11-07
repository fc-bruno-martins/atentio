import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { AnalysesPage } from './analyses-page'
import { PromptsPage } from './prompts-page'

const PROMPTS = 'GET /api/v1/analysis-prompts'
const RUN = 'POST /api/v1/analyses'
const MODELS = 'GET /api/v1/analysis-models'
const HISTORY = 'GET /api/v1/analyses'
const CATALOG = {
  presets: [
    { id: 'rapido', label: 'Rápido', description: 'Rápido', model: 'p/rapido', input_price: 0.1, output_price: 0.5 },
    { id: 'profundo', label: 'Profundo', description: 'Profundo', model: 'p/profundo', input_price: 2, output_price: 10 },
  ],
  default_preset: 'rapido',
}
const step = (agent: string, output: Record<string, unknown>, model: string | null = null) => ({
  agent,
  status: 'done',
  model,
  input: { mensagens: 1 },
  output,
  started_at: '2026-11-02T12:00:00Z',
  finished_at: '2026-11-02T12:00:02Z',
  metrics: model ? { latencia_ms: 1500, tokens_entrada: 100, tokens_saida: 20 } : { latencia_ms: 3 },
  events: model
    ? [
        { at: '2026-11-02T12:00:00Z', kind: 'start', message: 'Agente iniciado', data: {} },
        {
          at: '2026-11-02T12:00:00.100Z',
          kind: 'prompt',
          message: 'Prompt montado',
          data: { system: `Instruções do ${agent}`, usuario: 'conversa', caracteres_sistema: 20, caracteres_usuario: 8 },
        },
        { at: '2026-11-02T12:00:00.200Z', kind: 'llm_call', message: 'Chamando o modelo', data: { modelo: model } },
        { at: '2026-11-02T12:00:01.700Z', kind: 'llm_response', message: 'Resposta do modelo', data: { resposta: 'ok' } },
        { at: '2026-11-02T12:00:02Z', kind: 'done', message: 'Agente concluído', data: {} },
      ]
    : [{ at: '2026-11-02T12:00:00Z', kind: 'start', message: 'Agente iniciado', data: {} }],
})
const prompt = { id: 'p1', title: 'Pendências da semana', body: 'Liste' }
const analysis = {
  id: 'a1',
  conversation_id: 'c1',
  prompt_text: 'Resuma',
  model: 'modelo/x',
  status: 'done',
  result: 'Tudo certo',
  message_count: 3,
  created_at: '2026-11-02T12:00:00Z',
  steps: [
    step('coletor', { mensagens: 3, participantes: [{ nome: 'Ana', mensagens: 3 }] }),
    step('extrator', { contagem: { assuntos: 1, pedidos: 2 }, fatos: { assuntos: ['proposta'], pedidos: [{ quem: 'Ana', o_que: 'enviar contrato' }] } }, 'p/rapido'),
    step('analista', { palavras: 2, resposta: 'Prévia da resposta' }, 'p/rapido'),
    step('estruturador', { secoes: [{ titulo: 'Resposta', itens: 1 }], pendencias: 0, decisoes: 0 }),
    {
      ...step('publicador', {
        proposta: { resumo: 'Cliente satisfeito.', itens: [{ titulo: 'Enviar contrato', responsavel: 'Ana', prazo: 'sexta' }] },
      }),
      status: 'waiting',
      finished_at: null,
    },
  ],
}
const OUTPUTS = [
  { id: 'jira', name: 'Jira', action: 'Cria uma issue por pendência', tool: 'jira.create_issue', status: 'demo', note: null },
  { id: 'whatsapp', name: 'WhatsApp', action: 'Envia o resumo', tool: 'whatsapp.send_message', status: 'blocked', note: 'Bloqueado' },
]
const started = { ...analysis, status: 'running', result: null, steps: [] }
const STATUS = 'GET /api/v1/analyses/a1'
const conversation = {
  id: 'c1',
  connection_id: 'n1',
  channel: 'whatsapp',
  kind: 'group',
  name: 'Diretoria',
  contact: '123',
  last_message_at: '2026-11-02T12:00:00Z',
}
const message = {
  id: 'm1',
  from_me: false,
  sender_name: 'Ana',
  type: 'text',
  text: 'proposta aprovada',
  sent_at: '2026-11-02T12:00:00Z',
}

function pipelineApi(overrides: Record<string, { status?: number; body?: unknown }> = {}) {
  return mockApi({
    'GET /api/v1/channels': {
      body: [
        { id: 'whatsapp', name: 'WhatsApp', status: 'available' },
        { id: 'slack', name: 'Slack', status: 'coming_soon' },
      ],
    },
    'GET /api/v1/conversations': { body: [conversation] },
    'GET /api/v1/conversations/c1/messages': { body: { conversation, messages: [message] } },
    [PROMPTS]: { body: [prompt] },
    [MODELS]: { body: CATALOG },
    [RUN]: { status: 202, body: started },
    [STATUS]: { body: analysis },
    [HISTORY]: { body: [] },
    'GET /api/v1/output-connectors': { body: OUTPUTS },
    ...overrides,
  })
}

/** Canal → Origem → Configuração, parando antes de executar. */
async function goToConfig() {
  await userEvent.click(await screen.findByRole('button', { name: /WhatsApp/ }))
  await userEvent.click(await screen.findByRole('button', { name: /Diretoria/ }))
  await screen.findByText('proposta aprovada')
}

const runBody = (calls: { key: string; body: unknown }[]) =>
  calls.find((call) => call.key === RUN)?.body as Record<string, unknown> | undefined

afterEach(() => {
  vi.unstubAllGlobals()
})

it('lista o histórico na aba Histórico', async () => {
  pipelineApi({ [HISTORY]: { body: [analysis] } })
  renderWithQuery(<AnalysesPage />)
  await userEvent.click(await screen.findByRole('tab', { name: /Histórico/ }))
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

it('libera canal "em breve" que já tem conversas capturadas', async () => {
  const slack = { ...conversation, id: 'c2', channel: 'slack', name: '#ext-cliente' }
  pipelineApi({ 'GET /api/v1/conversations': { body: [conversation, slack] } })
  renderWithQuery(<AnalysesPage />)

  const button = await screen.findByRole('button', { name: /Slack/ })
  await waitFor(() => expect(button).toBeEnabled())
  expect(within(button).getByText('1 conversas capturadas')).toBeInTheDocument()
  await userEvent.click(button)
  expect(await screen.findByRole('button', { name: /#ext-cliente/ })).toBeInTheDocument()
})

it('percorre o pipeline e executa com as mensagens mais recentes', async () => {
  const calls = pipelineApi()
  renderWithQuery(<AnalysesPage />)
  expect(await screen.findByRole('button', { name: /Slack/ })).toBeDisabled()
  await goToConfig()
  expect(screen.getByText('1 mensagem entra na análise')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Configurar análise' }))
  await userEvent.click(screen.getByRole('button', { name: /^Compromissos/ }))
  expect(screen.getByLabelText('Prompt')).toHaveValue('Liste o que prometemos ao cliente, com responsável e prazo.')
  await screen.findByRole('radio', { name: /Rápido/ })
  await userEvent.click(screen.getByRole('button', { name: 'Executar análise' }))

  expect(await screen.findByText('Tudo certo')).toBeInTheDocument()
  for (const agent of ['Coletor', 'Extrator', 'Analista', 'Estruturador']) {
    expect(screen.getByRole('region', { name: agent })).toHaveAttribute('data-status', 'done')
  }
  const extractor = screen.getByRole('region', { name: 'Extrator' })
  expect(within(extractor).getByText('2 pedidos')).toBeInTheDocument()
  expect(within(extractor).getByText('enviar contrato')).toBeInTheDocument()
  expect(runBody(calls)).toMatchObject({
    conversation_id: 'c1',
    preset: 'rapido',
    prompt_text: 'Liste o que prometemos ao cliente, com responsável e prazo.',
  })
  expect(runBody(calls)).not.toHaveProperty('message_ids')
})

it('analisa só as mensagens selecionadas', async () => {
  const calls = pipelineApi()
  renderWithQuery(<AnalysesPage />)
  await goToConfig()
  await userEvent.click(screen.getByRole('button', { name: /Selecionar/ }))
  expect(screen.getByRole('button', { name: 'Configurar análise' })).toBeDisabled()
  await userEvent.click(screen.getByRole('checkbox'))
  expect(screen.getByText('1 mensagem entra na análise')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Configurar análise' }))
  await userEvent.click(screen.getByRole('button', { name: 'Pendências da semana' }))
  await screen.findByRole('radio', { name: /Rápido/ })
  await userEvent.click(screen.getByRole('button', { name: 'Executar análise' }))
  await screen.findByText('Tudo certo')
  expect(runBody(calls)).toMatchObject({ prompt_id: 'p1', message_ids: ['m1'] })
})

it('usa o período escolhido', async () => {
  const calls = pipelineApi()
  renderWithQuery(<AnalysesPage />)
  await goToConfig()
  await userEvent.click(screen.getByRole('button', { name: /Período/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Hoje' }))
  await screen.findByText('proposta aprovada')
  await userEvent.click(screen.getByRole('button', { name: 'Configurar análise' }))
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await screen.findByRole('radio', { name: /Rápido/ })
  await userEvent.click(screen.getByRole('button', { name: 'Executar análise' }))
  await screen.findByText('Tudo certo')
  expect(runBody(calls)).toHaveProperty('since')
})

it('começa na origem quando vem de Conversas', async () => {
  pipelineApi()
  renderWithQuery(<AnalysesPage initialConversationId="c1" />)
  expect(await screen.findByText('proposta aprovada')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Qual conversa e quais mensagens?' })).toBeInTheDocument()
})

it('deixa escolher o perfil do modelo', async () => {
  const calls = pipelineApi()
  renderWithQuery(<AnalysesPage />)
  await goToConfig()
  await userEvent.click(screen.getByRole('button', { name: 'Configurar análise' }))
  expect(await screen.findByRole('radio', { name: /Rápido/ })).toHaveAttribute('aria-checked', 'true')
  await userEvent.click(screen.getByRole('radio', { name: /Profundo/ }))
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await userEvent.click(screen.getByRole('button', { name: 'Executar análise' }))
  await screen.findByText('Tudo certo')
  expect(runBody(calls)).toMatchObject({ preset: 'profundo' })
})

it('sem pergunta ou sem modelo não executa', async () => {
  pipelineApi({ [MODELS]: { body: { presets: [], default_preset: '' } } })
  renderWithQuery(<AnalysesPage />)
  await goToConfig()
  await userEvent.click(screen.getByRole('button', { name: 'Configurar análise' }))
  expect(screen.getByRole('button', { name: 'Executar análise' })).toBeDisabled()
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  expect(screen.getByRole('button', { name: 'Executar análise' })).toBeDisabled()
})

it('mostra a falha no agente analista e deixa tentar de novo', async () => {
  const failed = {
    ...analysis,
    status: 'failed',
    result: null,
    steps: [
      analysis.steps[0],
      analysis.steps[1],
      { ...analysis.steps[2], status: 'failed', output: { erro: 'O provedor não respondeu.' } },
      { ...analysis.steps[3], status: 'pending', output: {}, started_at: null, finished_at: null },
    ],
  }
  pipelineApi({ [STATUS]: { body: failed } })
  renderWithQuery(<AnalysesPage />)
  await goToConfig()
  await userEvent.click(screen.getByRole('button', { name: 'Configurar análise' }))
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await screen.findByRole('radio', { name: /Rápido/ })
  await userEvent.click(screen.getByRole('button', { name: 'Executar análise' }))
  const lane = await screen.findByRole('region', { name: 'Analista' })
  expect(await within(lane).findByText(/provedor não respondeu/)).toBeInTheDocument()
  expect(lane).toHaveAttribute('data-status', 'failed')
  expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
})

it('informa quando as análises não estão configuradas', async () => {
  const text = 'As análises ainda não foram configuradas nesta plataforma.'
  pipelineApi({ [RUN]: { status: 503, body: { code: 'analysis_not_configured', message: text } } })
  renderWithQuery(<AnalysesPage />)
  await goToConfig()
  await userEvent.click(screen.getByRole('button', { name: 'Configurar análise' }))
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await screen.findByRole('radio', { name: /Rápido/ })
  await userEvent.click(screen.getByRole('button', { name: 'Executar análise' }))
  expect(await screen.findByText(text)).toBeInTheDocument()
})

it('mostra o resultado em seções', async () => {
  pipelineApi({
    [RUN]: {
      status: 202,
      body: started,
    },
    [STATUS]: {
      body: { ...analysis, result: '## Resumo\nTudo certo\n\n## Pendências\n- [ ] Ligar' },
    },
  })
  renderWithQuery(<AnalysesPage />)
  await goToConfig()
  await userEvent.click(screen.getByRole('button', { name: 'Configurar análise' }))
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await screen.findByRole('radio', { name: /Rápido/ })
  await userEvent.click(screen.getByRole('button', { name: 'Executar análise' }))
  expect(await screen.findByRole('heading', { name: /Pendências/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Copiar análise' })).toBeInTheDocument()
})

it('mostra o debug do harness com grafo, log e inspetor', async () => {
  pipelineApi()
  renderWithQuery(<AnalysesPage />)
  await goToConfig()
  await userEvent.click(screen.getByRole('button', { name: 'Configurar análise' }))
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await screen.findByRole('radio', { name: /Rápido/ })
  await userEvent.click(screen.getByRole('button', { name: 'Executar análise' }))
  await screen.findByText('Tudo certo')

  await userEvent.click(screen.getByRole('tab', { name: 'Debug do harness' }))
  const debug = screen.getByRole('region', { name: 'Debug do harness' })
  expect(within(debug).getByRole('img', { name: 'Grafo de execução do harness' })).toBeInTheDocument()
  expect(within(debug).getByText('Chamadas à IA').previousSibling).toHaveTextContent('2')
  const log = within(debug).getByRole('list', { name: 'Log de eventos dos agentes' })
  expect(within(log).getAllByText(/Chamando o modelo/)).toHaveLength(2)

  await userEvent.click(within(debug).getByRole('button', { name: 'Extrator: done' }))
  expect(within(debug).getByText(/"Instruções do extrator"/)).toBeInTheDocument()
})

it('o publicador espera a revisão humana e publica nos conectores de saída', async () => {
  const published = {
    ...analysis,
    steps: [
      ...analysis.steps.slice(0, 4),
      {
        ...analysis.steps[4],
        status: 'done',
        output: {
          entregas: [
            {
              conector: 'jira',
              nome: 'Jira',
              ferramenta: 'jira.create_issue',
              argumentos: { title: 'Enviar contrato agora' },
              status: 'simulado',
              referencia: 'CS-101',
              mensagem: 'Simulação',
              workspace: 'Projeto CS',
              item: { chave: 'CS-101', titulo: 'Enviar contrato agora', estado: 'To Do', tipo: 'Task', responsavel: 'Ana' },
            },
          ],
        },
      },
    ],
  }
  window.localStorage.setItem(
    'atentio:output-connections',
    JSON.stringify({ jira: { server: 'mcp-jira', workspace: 'Projeto CS', tools: ['jira.create_issue'] } }),
  )
  const calls = pipelineApi({ 'POST /api/v1/analyses/a1/publish': { body: published } })
  renderWithQuery(<AnalysesPage />)
  await goToConfig()
  await userEvent.click(screen.getByRole('button', { name: 'Configurar análise' }))
  await userEvent.type(screen.getByLabelText('Prompt'), 'Resuma')
  await screen.findByRole('radio', { name: /Rápido/ })
  await userEvent.click(screen.getByRole('button', { name: 'Executar análise' }))

  const panel = await screen.findByRole('region', { name: 'Publicador' })
  expect(panel).toHaveAttribute('data-status', 'waiting')
  expect(within(panel).getByRole('button', { name: /Aprovar e publicar/ })).toBeDisabled()
  expect(await within(panel).findByRole('button', { name: /WhatsApp/ })).toBeDisabled()

  const title = within(panel).getByLabelText('Pendência 1')
  await userEvent.clear(title)
  await userEvent.type(title, 'Enviar contrato agora')
  await userEvent.click(within(panel).getByRole('button', { name: /Jira/ }))
  await userEvent.click(within(panel).getByRole('button', { name: /Aprovar e publicar/ }))

  expect(await screen.findByText(/jira.create_issue/)).toBeInTheDocument()
  expect(screen.getByText('CS-101', { selector: 'span.font-mono' })).toBeInTheDocument()
  expect(screen.getByText('To Do')).toBeInTheDocument()
  window.localStorage.clear()
  expect(calls.find((c) => c.key === 'POST /api/v1/analyses/a1/publish')?.body).toMatchObject({
    approve: true,
    destinations: ['jira'],
    items: [{ title: 'Enviar contrato agora', owner: 'Ana', due: 'sexta' }],
  })
})

it('conecta um destino de saída simulando o handshake MCP', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const calls = mockApi({
    'POST /api/v1/output-connectors/notion/connect': {
      body: { server: 'mcp-notion (simulado)', workspace: 'Workspace CS', tools: ['notion.create_page'] },
    },
  })
  const { ConnectOutputDialog } = await import('@/features/shared')
  const onClose = vi.fn()
  renderWithQuery(
    <ConnectOutputDialog
      output={{ id: 'notion', name: 'Notion', action: 'Cria página', tool: 'notion.create_page', status: 'demo', note: null }}
      onClose={onClose}
    />,
  )
  expect(screen.getByRole('button', { name: 'Conectando…' })).toBeDisabled()
  await vi.advanceTimersByTimeAsync(3000)
  expect(await screen.findByText('Workspace CS')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Concluir' }))
  expect(JSON.parse(window.localStorage.getItem('atentio:output-connections') ?? '{}').notion.workspace).toBe('Workspace CS')
  expect(calls.some((c) => c.key === 'POST /api/v1/output-connectors/notion/connect')).toBe(true)
  vi.useRealTimers()
  window.localStorage.clear()
})
