import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { CompanyChannelsPage } from './company-channels-page'

const LIST = 'GET /api/v1/company-connections'
const number = {
  id: 'n1',
  channel: 'whatsapp',
  account: '5511999999999',
  status: 'connected',
  status_changed_at: '2026-11-02T12:00:00Z',
  confirmed: true,
  disconnect_reason: null,
  owner_id: 'u1',
  owner_name: 'Ana',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it('lista dono, telefone completo e situação', async () => {
  mockApi({ [LIST]: { body: [number] } })
  renderWithQuery(<CompanyChannelsPage />)
  expect(await screen.findByText('Ana')).toBeInTheDocument()
  expect(screen.getByText(/\+5511999999999/)).toBeInTheDocument()
  expect(screen.getByText('Conectado')).toBeInTheDocument()
})

it('mostra a lista vazia', async () => {
  mockApi({ [LIST]: { body: [] } })
  renderWithQuery(<CompanyChannelsPage />)
  expect(await screen.findByText('Nenhuma conta conectada na empresa')).toBeInTheDocument()
})

it('número desconectado não oferece desconexão', async () => {
  mockApi({ [LIST]: { body: [{ ...number, status: 'disconnected' }] } })
  renderWithQuery(<CompanyChannelsPage />)
  await screen.findByText('Desconectado')
  expect(screen.queryByRole('button', { name: 'Desconectar' })).not.toBeInTheDocument()
})

it('desconecta com confirmação', async () => {
  const disconnect = 'POST /api/v1/company-connections/n1/disconnect'
  const calls = mockApi({ [LIST]: { body: [number] }, [disconnect]: { body: number } })
  renderWithQuery(<CompanyChannelsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Desconectar' }))
  expect(calls.some((call) => call.key === disconnect)).toBe(false)
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar desconexão' }))
  await waitFor(() => expect(calls.some((call) => call.key === disconnect)).toBe(true))
})
