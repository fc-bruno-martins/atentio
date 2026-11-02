import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { CompaniesPage } from './companies-page'

const acme = { id: '1', name: 'Acme', is_active: true }

afterEach(() => {
  vi.unstubAllGlobals()
})

it('lista e desativa uma empresa', async () => {
  const calls = mockApi({
    'GET /api/v1/companies': { body: [acme] },
    'PATCH /api/v1/companies/1': { body: { ...acme, is_active: false } },
  })
  renderWithQuery(<CompaniesPage />)

  expect(await screen.findByText('Acme')).toBeInTheDocument()
  expect(screen.getByText('Ativa')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Desativar' }))

  await vi.waitFor(() =>
    expect(calls.find((c) => c.key.startsWith('PATCH'))?.body).toEqual({ is_active: false }),
  )
})

it('renomeia uma empresa', async () => {
  const calls = mockApi({
    'GET /api/v1/companies': { body: [acme] },
    'PATCH /api/v1/companies/1': { body: acme },
  })
  renderWithQuery(<CompaniesPage />)

  await userEvent.click(await screen.findByRole('button', { name: 'Renomear' }))
  const name = screen.getByLabelText('Nome')
  await userEvent.clear(name)
  await userEvent.type(name, 'Acme 2')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

  await vi.waitFor(() =>
    expect(calls.find((c) => c.key.startsWith('PATCH'))?.body).toEqual({ name: 'Acme 2' }),
  )
})

async function create() {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Nova empresa' }))
  await user.type(screen.getByLabelText('Nome da empresa'), 'Nova')
  await user.type(screen.getByLabelText('E-mail do primeiro admin'), 'a@nova.com')
  await user.click(screen.getByRole('button', { name: 'Criar e enviar convite' }))
}

it('cria empresa com o e-mail do primeiro admin', async () => {
  const calls = mockApi({
    'GET /api/v1/companies': { body: [] },
    'POST /api/v1/companies': { status: 201, body: { invitation_email_failed: false } },
  })
  renderWithQuery(<CompaniesPage />)

  await create()

  await vi.waitFor(() =>
    expect(calls.find((c) => c.key.startsWith('POST'))?.body).toEqual({
      name: 'Nova',
      admin_email: 'a@nova.com',
    }),
  )
})

it('avisa quando o convite não foi enviado', async () => {
  mockApi({
    'GET /api/v1/companies': { body: [] },
    'POST /api/v1/companies': { status: 201, body: { invitation_email_failed: true } },
  })
  renderWithQuery(<CompaniesPage />)

  await create()

  expect(await screen.findByRole('alert')).toHaveTextContent('o convite não foi enviado')
})

it('mostra o erro de e-mail em uso', async () => {
  mockApi({
    'GET /api/v1/companies': { body: [] },
    'POST /api/v1/companies': { status: 409, body: { message: 'Este e-mail já está em uso.' } },
  })
  renderWithQuery(<CompaniesPage />)

  await create()

  expect(await screen.findByRole('alert')).toHaveTextContent('Este e-mail já está em uso.')
})
