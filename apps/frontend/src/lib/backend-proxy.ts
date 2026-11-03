import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './session-cookie'

/** Respostas que abrem sessão: o token vira cookie e nunca chega ao JavaScript. */
const SESSION_PATHS = ['/api/v1/auth/login', '/api/v1/invitations/accept']
const LOGOUT_PATH = '/api/v1/auth/logout'
const FORWARDED = ['content-type', 'accept', 'x-forwarded-for']

function backendUrl(): string {
  return process.env.BACKEND_URL ?? 'http://localhost:8100'
}

function cookieHeader(value: string, maxAge: number): string {
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

function readCookie(request: Request): string | undefined {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === SESSION_COOKIE) return value.join('=')
  }
  return undefined
}

function unavailable(): Response {
  return Response.json(
    { code: 'backend_unavailable', message: 'A plataforma está indisponível no momento.' },
    { status: 503 },
  )
}

export async function forwardToBackend(request: Request): Promise<Response> {
  const { pathname, search } = new URL(request.url)
  const token = readCookie(request)
  const headers = new Headers()
  for (const name of FORWARDED) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (token) headers.set('authorization', `Bearer ${token}`)

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  let upstream: Response
  try {
    upstream = await fetch(`${backendUrl()}${pathname}${search}`, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      cache: 'no-store',
    })
  } catch {
    return unavailable()
  }

  if (SESSION_PATHS.includes(pathname) && upstream.ok) {
    const { token: newToken, ...session } = (await upstream.json()) as { token: string }
    const response = Response.json(session)
    response.headers.append('set-cookie', cookieHeader(newToken, SESSION_MAX_AGE_SECONDS))
    return response
  }

  const body = upstream.status === 204 ? null : await upstream.text()
  const response = new Response(body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
  // O QR code dá acesso à conta de WhatsApp: a resposta não pode ficar em cache.
  const cacheControl = upstream.headers.get('cache-control')
  if (cacheControl) response.headers.set('cache-control', cacheControl)
  if (pathname === LOGOUT_PATH || (token && upstream.status === 401)) {
    response.headers.append('set-cookie', cookieHeader('', 0))
  } else if (token && upstream.ok) {
    response.headers.append('set-cookie', cookieHeader(token, SESSION_MAX_AGE_SECONDS))
  }
  return response
}
