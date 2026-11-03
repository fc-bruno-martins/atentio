import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { UsersPage } from './users-page'

const ana = { id: '1', name: 'Ana', email: 'ana@acme.com', role: 'user', is_active: true }
const pending = {
  id: '9',
  email: 'novo@acme.com',
  role: 'user',
  expires_at: '2026-11-09T12:00:00Z',
  email_failed: true,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it('lista usuários e convites com falha no envio', async () => {
  mockApi({
    'GET /api/v1/users': { body: [ana] },
    'GET /api/v1/company-invitations': { body: [pending] },
  })
  renderWithQuery(<UsersPage />)

  expect(await screen.findByText('ana@acme.com')).toBeInTheDocument()
  expect(await screen.findByText('novo@acme.com')).toBeInTheDocument()
  expect(screen.getByText('Falha no envio')).toBeInTheDocument()
})

it('altera perfil e desativa', async () => {
  const calls = mockApi({
    'GET /api/v1/users': { body: [ana] },
    'GET /api/v1/company-invitations': { body: [] },
    'PATCH /api/v1/users/1': { body: ana },
  })
  renderWithQuery(<UsersPage />)

  await userEvent.click(await screen.findByRole('button', { name: 'Tornar admin' }))
  await userEvent.click(screen.getByRole('button', { name: 'Desativar' }))

  await vi.waitFor(() => {
    const bodies = calls.filter((c) => c.key.startsWith('PATCH')).map((c) => c.body)
    expect(bodies).toEqual([{ role: 'company_admin' }, { is_active: false }])
  })
})

it('mostra a recusa do último admin', async () => {
  mockApi({
    'GET /api/v1/users': { body: [{ ...ana, role: 'company_admin' }] },
    'GET /api/v1/company-invitations': { body: [] },
    'PATCH /api/v1/users/1': {
      status: 409,
      body: { message: 'A empresa precisa manter ao menos um admin ativo.' },
    },
  })
  renderWithQuery(<UsersPage />)

  await userEvent.click(await screen.findByRole('button', { name: 'Desativar' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('ao menos um admin ativo')
})

it('convida, reenvia e cancela', async () => {
  const calls = mockApi({
    'GET /api/v1/users': { body: [ana] },
    'GET /api/v1/company-invitations': { body: [pending] },
    'POST /api/v1/company-invitations': { status: 201, body: pending },
    'POST /api/v1/company-invitations/9/resend': { body: pending },
    'DELETE /api/v1/company-invitations/9': { status: 204 },
  })
  renderWithQuery(<UsersPage />)
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: 'Reenviar' }))
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  await user.click(screen.getByRole('button', { name: 'Convidar' }))
  await user.type(screen.getByLabelText('E-mail'), 'outro@acme.com')
  await user.click(screen.getByRole('button', { name: 'Enviar convite' }))

  await vi.waitFor(() => {
    const keys = calls.map((c) => c.key)
    expect(keys).toContain('POST /api/v1/company-invitations/9/resend')
    expect(keys).toContain('DELETE /api/v1/company-invitations/9')
    expect(calls.find((c) => c.key === 'POST /api/v1/company-invitations')?.body).toEqual({
      email: 'outro@acme.com',
      role: 'user',
    })
  })
})

it('o admin configura modelo e prompt adicional por usuário', async () => {
  const route = '/api/v1/users/1/ai-settings'
  const calls = mockApi({
    'GET /api/v1/users': { body: [ana] },
    'GET /api/v1/company-invitations': { body: [] },
    [`GET ${route}`]: { body: { model: null, temperature: null, extra_prompt: null } },
    'GET /api/v1/analysis-models': { body: { models: [], default_model: null } },
    [`PUT ${route}`]: { body: {} },
  })
  renderWithQuery(<UsersPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Análises' }))
  await userEvent.type(await screen.findByLabelText(/Modelo/), 'modelo/x')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() =>
    expect(calls.find((c) => c.key === `PUT ${route}`)?.body).toMatchObject({ model: 'modelo/x' }),
  )
})
