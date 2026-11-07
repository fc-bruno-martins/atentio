import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { ChannelsPage } from './channels-page'

const LIST = 'GET /api/v1/connections'
const CHANNELS = 'GET /api/v1/channels'
const START = 'POST /api/v1/channels/whatsapp/attempts'
const CONNECTION = 'GET /api/v1/channels/whatsapp/attempts/a1'
const CATALOG = [
  { id: 'whatsapp', name: 'WhatsApp', status: 'available' },
  { id: 'slack', name: 'Slack', status: 'coming_soon' },
]

const number = {
  id: 'n1',
  channel: 'whatsapp',
  account: '5511999999999',
  status: 'connected',
  status_changed_at: '2026-11-02T12:00:00Z',
  confirmed: true,
  disconnect_reason: null,
}
const attempt = {
  id: 'a1',
  status: 'pending',
  qr_code: 'data:image/png;base64,QR',
  failure: null,
  expires_at: '2026-11-02T12:05:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

async function openAndGenerate() {
  await userEvent.click(await screen.findByRole('button', { name: 'Conectar WhatsApp' }))
  await userEvent.click(screen.getByRole('button', { name: 'Gerar QR code' }))
}

it('lista os próprios números', async () => {
  mockApi({ [CHANNELS]: { body: CATALOG }, [LIST]: { body: [number] } })
  renderWithQuery(<ChannelsPage />)
  expect(await screen.findByText('+5511999999999')).toBeInTheDocument()
  expect(screen.getByText('Conectado')).toBeInTheDocument()
})

it('mostra cada conector e o Slack como em breve', async () => {
  mockApi({ [CHANNELS]: { body: CATALOG }, [LIST]: { body: [] } })
  renderWithQuery(<ChannelsPage />)
  expect(await screen.findByText('Nenhuma conta conectada.')).toBeInTheDocument()
  expect(screen.getByText('Slack')).toBeInTheDocument()
  expect(screen.getByText('Em breve')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Conectar Slack' })).not.toBeInTheDocument()
})

it('avisa do risco antes de gerar o QR code', async () => {
  const calls = mockApi({ [CHANNELS]: { body: CATALOG }, [LIST]: { body: [] } })
  renderWithQuery(<ChannelsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Conectar WhatsApp' }))
  expect(screen.getByText(/pode resultar em banimento/)).toBeInTheDocument()
  expect(within(screen.getByRole('dialog')).getByText(/somente\s+leitura/)).toBeInTheDocument()
  expect(calls.some((call) => call.key === START)).toBe(false)
})

it('mostra o QR code e as instruções', async () => {
  mockApi({
    [CHANNELS]: { body: CATALOG }, [LIST]: { body: [] },
    [START]: { status: 201, body: attempt },
    [CONNECTION]: { body: attempt },
  })
  renderWithQuery(<ChannelsPage />)
  await openAndGenerate()
  const image = await screen.findByAltText('QR code para conectar o WhatsApp')
  expect(image).toHaveAttribute('src', attempt.qr_code)
  expect(screen.getByText(/Aparelhos conectados/)).toBeInTheDocument()
})

it('fecha e atualiza a lista quando o número conecta', async () => {
  const routes = {
    [CHANNELS]: { body: CATALOG }, [LIST]: { body: [] as unknown[] },
    [START]: { status: 201, body: attempt },
    [CONNECTION]: { body: { ...attempt, status: 'connected', qr_code: null } },
  }
  mockApi(routes)
  renderWithQuery(<ChannelsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Conectar WhatsApp' }))
  routes[LIST].body = [number]
  await userEvent.click(screen.getByRole('button', { name: 'Gerar QR code' }))
  expect(await screen.findByText('+5511999999999')).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('explica a recusa de número em uso sem citar o dono', async () => {
  mockApi({
    [CHANNELS]: { body: CATALOG }, [LIST]: { body: [] },
    [START]: { status: 201, body: attempt },
    [CONNECTION]: {
      body: { ...attempt, status: 'rejected', qr_code: null, failure: 'number_in_use' },
    },
  })
  renderWithQuery(<ChannelsPage />)
  await openAndGenerate()
  expect(await screen.findByText('Este número já está conectado a outra conta.')).toBeInTheDocument()
})

it('oferece novo QR code quando o anterior expira', async () => {
  mockApi({
    [CHANNELS]: { body: CATALOG }, [LIST]: { body: [] },
    [START]: { status: 201, body: attempt },
    [CONNECTION]: { body: { ...attempt, status: 'expired', qr_code: null } },
  })
  renderWithQuery(<ChannelsPage />)
  await openAndGenerate()
  expect(await screen.findByText(/QR code expirou/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Gerar outro QR code' })).toBeInTheDocument()
})

it('mostra o limite de números', async () => {
  mockApi({
    [CHANNELS]: { body: CATALOG }, [LIST]: { body: [] },
    [START]: { status: 409, body: { code: 'number_limit', message: 'Você já tem 2 números conectados.' } },
  })
  renderWithQuery(<ChannelsPage />)
  await openAndGenerate()
  expect(await screen.findByText('Você já tem 2 números conectados.')).toBeInTheDocument()
})

it('cancela a tentativa ao fechar', async () => {
  const calls = mockApi({
    [CHANNELS]: { body: CATALOG }, [LIST]: { body: [] },
    [START]: { status: 201, body: attempt },
    [CONNECTION]: { body: attempt },
    'DELETE /api/v1/channels/whatsapp/attempts/a1': { status: 204 },
  })
  renderWithQuery(<ChannelsPage />)
  await openAndGenerate()
  await screen.findByAltText('QR code para conectar o WhatsApp')
  await userEvent.keyboard('{Escape}')
  await waitFor(() =>
    expect(calls.some((call) => call.key === 'DELETE /api/v1/channels/whatsapp/attempts/a1')).toBe(true),
  )
})

it('marca a situação não confirmada', async () => {
  mockApi({ [CHANNELS]: { body: CATALOG }, [LIST]: { body: [{ ...number, confirmed: false }] } })
  renderWithQuery(<ChannelsPage />)
  expect(await screen.findByText('Não confirmado')).toBeInTheDocument()
})

it('mostra quem desconectou e oferece reconectar', async () => {
  mockApi({
    [CHANNELS]: { body: CATALOG },
    [LIST]: {
      body: [{ ...number, status: 'disconnected', disconnect_reason: 'company_admin' }],
    },
  })
  renderWithQuery(<ChannelsPage />)
  expect(await screen.findByText('Desconectado pelo admin da empresa')).toBeInTheDocument()
  await userEvent.click(await screen.findByRole('button', { name: 'Reconectar' }))
  expect(screen.getByRole('button', { name: 'Gerar QR code' })).toBeInTheDocument()
})

it('só desconecta depois da confirmação', async () => {
  const disconnect = 'POST /api/v1/connections/n1/disconnect'
  const calls = mockApi({ [CHANNELS]: { body: CATALOG }, [LIST]: { body: [number] }, [disconnect]: { body: number } })
  renderWithQuery(<ChannelsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Desconectar' }))
  expect(calls.some((call) => call.key === disconnect)).toBe(false)
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar desconexão' }))
  await waitFor(() => expect(calls.some((call) => call.key === disconnect)).toBe(true))
})

it('separa conectores de entrada e de saída', async () => {
  mockApi({
    [CHANNELS]: { body: CATALOG },
    [LIST]: { body: [] },
    'GET /api/v1/output-connectors': {
      body: [
        { id: 'notion', name: 'Notion', action: 'Cria uma página', tool: 'notion.create_page', status: 'demo', note: null },
        { id: 'whatsapp', name: 'WhatsApp', action: 'Envia o resumo', tool: 'whatsapp.send_message', status: 'blocked', note: 'Bloqueado: somente leitura.' },
      ],
    },
  })
  renderWithQuery(<ChannelsPage />)
  expect(screen.getByRole('heading', { name: 'Conectores de entrada' })).toBeInTheDocument()
  const outputs = await screen.findByRole('list', { name: 'Conectores de saída' })
  expect(await within(outputs).findByText('Notion')).toBeInTheDocument()
  expect(within(outputs).getByText('Simulação')).toBeInTheDocument()
  expect(within(outputs).getByRole('button', { name: /Conectar Notion/ })).toBeInTheDocument()
  expect(within(outputs).getByText('Bloqueado: somente leitura.')).toBeInTheDocument()
})
