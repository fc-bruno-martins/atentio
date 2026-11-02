import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { ForgotPasswordForm } from './forgot-password-form'
import { LoginForm } from './login-form'
import { ResetPasswordForm } from './reset-password-form'

afterEach(() => {
  vi.unstubAllGlobals()
})

async function fillLogin() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('E-mail'), 'ana@acme.com')
  await user.type(screen.getByLabelText('Senha'), 'senha-muito-boa')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginForm', () => {
  it('entra e vai para a tela inicial do perfil', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    const calls = mockApi({
      'POST /api/v1/auth/login': { body: { user: { role: 'company_admin' } } },
    })
    renderWithQuery(<LoginForm />)

    await fillLogin()

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/usuarios'))
    expect(calls[0]?.body).toEqual({ email: 'ana@acme.com', password: 'senha-muito-boa' })
  })

  it('mostra a mensagem genérica da API', async () => {
    mockApi({
      'POST /api/v1/auth/login': { status: 401, body: { message: 'E-mail ou senha incorretos.' } },
    })
    renderWithQuery(<LoginForm />)

    await fillLogin()

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
  })

  it('mostra erro claro quando a plataforma está fora', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rede')))
    renderWithQuery(<LoginForm />)

    await fillLogin()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar à plataforma.',
    )
  })
})

describe('recuperação de senha', () => {
  it('mostra sempre a mesma confirmação', async () => {
    mockApi({ 'POST /api/v1/auth/password-recovery': { status: 202 } })
    renderWithQuery(<ForgotPasswordForm />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('E-mail'), 'x@acme.com')
    await user.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Se o e-mail estiver cadastrado, enviaremos um link.',
    )
  })

  it('envia a nova senha com o token do link', async () => {
    const calls = mockApi({ 'POST /api/v1/auth/password-reset': { status: 204 } })
    renderWithQuery(<ResetPasswordForm token="abc" />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Nova senha'), 'senha-nova-boa')
    await user.click(screen.getByRole('button', { name: 'Salvar senha' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Senha alterada.')
    expect(calls[0]?.body).toEqual({ token: 'abc', password: 'senha-nova-boa' })
  })

  it('avisa quando o link é inválido', async () => {
    mockApi({
      'POST /api/v1/auth/password-reset': { status: 400, body: { message: 'Link inválido.' } },
    })
    renderWithQuery(<ResetPasswordForm token="abc" />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Nova senha'), 'senha-nova-boa')
    await user.click(screen.getByRole('button', { name: 'Salvar senha' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Link inválido.')
  })
})
