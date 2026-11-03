import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { ProfilePage } from './profile-page'

const me = { id: '1', name: 'Ana', email: 'ana@acme.com', role: 'user', company: null }

afterEach(() => {
  vi.unstubAllGlobals()
})

it('altera o nome', async () => {
  const calls = mockApi({
    'GET /api/v1/me': { body: me },
    'GET /api/v1/mcp-tokens': { body: [] },
    'PATCH /api/v1/me': { body: { ...me, name: 'Ana Maria' } },
  })
  renderWithQuery(<ProfilePage />)

  const name = await screen.findByLabelText('Nome')
  await userEvent.clear(name)
  await userEvent.type(name, 'Ana Maria')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }))

  expect(await screen.findByText('Nome atualizado.')).toBeInTheDocument()
  expect(calls.find((c) => c.key === 'PATCH /api/v1/me')?.body).toEqual({ name: 'Ana Maria' })
})

it('altera a senha e mostra erro de senha atual incorreta', async () => {
  mockApi({
    'GET /api/v1/me': { body: me },
    'GET /api/v1/mcp-tokens': { body: [] },
    'PUT /api/v1/me/password': { status: 400, body: { message: 'A senha atual está incorreta.' } },
  })
  renderWithQuery(<ProfilePage />)
  const user = userEvent.setup()

  await user.type(await screen.findByLabelText('Senha atual'), 'errada')
  await user.type(screen.getByLabelText('Nova senha'), 'senha-nova-boa')
  await user.click(screen.getByRole('button', { name: 'Alterar senha' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('A senha atual está incorreta.')
})
