import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { AcceptInvitationForm } from './accept-invitation-form'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('cria a conta e abre a plataforma', async () => {
  const assign = vi.fn()
  vi.stubGlobal('location', { ...window.location, assign })
  const calls = mockApi({
    'POST /api/v1/invitations/lookup': { body: { email: 'a@acme.com', company_name: 'Acme' } },
    'POST /api/v1/invitations/accept': { body: {} },
  })
  renderWithQuery(<AcceptInvitationForm token="abc" />)

  expect(await screen.findByText('Entrar na Acme')).toBeInTheDocument()
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Nome'), 'Ana')
  await user.type(screen.getByLabelText('Senha'), 'senha-muito-boa')
  await user.click(screen.getByRole('button', { name: 'Criar conta' }))

  await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/'))
  expect(calls[1]?.body).toEqual({ token: 'abc', name: 'Ana', password: 'senha-muito-boa' })
})

it('avisa quando o convite é inválido', async () => {
  mockApi({
    'POST /api/v1/invitations/lookup': {
      status: 410,
      body: { message: 'Este convite é inválido, expirou ou já foi usado.' },
    },
  })
  renderWithQuery(<AcceptInvitationForm token="abc" />)

  expect(await screen.findByRole('alert')).toHaveTextContent('Este convite é inválido')
  expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
})
