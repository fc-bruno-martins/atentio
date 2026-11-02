import { afterEach, describe, expect, it, vi } from 'vitest'
import { forwardToBackend } from './backend-proxy'

function mockBackend(response: Response | Error) {
  const fn =
    response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fn)
  return fn
}

function request(path: string, init?: RequestInit) {
  return new Request(`http://app${path}`, init)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('forwardToBackend', () => {
  it('envia o cookie como Bearer', async () => {
    const backend = mockBackend(Response.json({ ok: true }))

    await forwardToBackend(
      request('/api/v1/me?x=1', { headers: { cookie: 'a=1; judite_session=abc' } }),
    )

    const [url, init] = backend.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/api\/v1\/me\?x=1$/)
    expect((init.headers as Headers).get('authorization')).toBe('Bearer abc')
  })

  it('no login, o token vira cookie httpOnly e não chega ao navegador', async () => {
    mockBackend(Response.json({ token: 'segredo', expires_at: 'x', user: { id: '1' } }))

    const response = await forwardToBackend(
      request('/api/v1/auth/login', { method: 'POST', body: '{}' }),
    )

    const cookie = response.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('judite_session=segredo')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(await response.text()).not.toContain('segredo')
  })

  it('o aceite de convite também não expõe o token', async () => {
    mockBackend(Response.json({ token: 'segredo', expires_at: 'x', user: { id: '1' } }))

    const response = await forwardToBackend(
      request('/api/v1/invitations/accept', { method: 'POST', body: '{}' }),
    )

    expect(await response.text()).not.toContain('segredo')
  })

  it('login recusado não cria cookie', async () => {
    mockBackend(Response.json({ code: 'invalid_credentials', message: 'x' }, { status: 401 }))

    const response = await forwardToBackend(
      request('/api/v1/auth/login', { method: 'POST', body: '{}' }),
    )

    expect(response.status).toBe(401)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('logout e sessão inválida apagam o cookie', async () => {
    mockBackend(new Response(null, { status: 204 }))
    const logout = await forwardToBackend(
      request('/api/v1/auth/logout', {
        method: 'POST',
        headers: { cookie: 'judite_session=abc' },
      }),
    )
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0')

    mockBackend(Response.json({}, { status: 401 }))
    const expired = await forwardToBackend(
      request('/api/v1/me', { headers: { cookie: 'judite_session=abc' } }),
    )
    expect(expired.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('marca o cookie como Secure quando configurado', async () => {
    vi.stubEnv('COOKIE_SECURE', 'true')
    mockBackend(Response.json({ token: 't' }))

    const response = await forwardToBackend(
      request('/api/v1/auth/login', { method: 'POST', body: '{}' }),
    )

    expect(response.headers.get('set-cookie')).toContain('Secure')
    vi.unstubAllEnvs()
  })

  it('responde 503 com o backend fora', async () => {
    mockBackend(new Error('recusado'))

    const response = await forwardToBackend(request('/api/v1/me'))

    expect(response.status).toBe(503)
  })
})
