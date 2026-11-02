import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { vi } from 'vitest'

export function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

type Route = { status?: number; body?: unknown }

/** Dublê de fetch: `{ 'GET /api/v1/me': { body } }`. */
export function mockApi(routes: Record<string, Route>) {
  const calls: { key: string; body: unknown }[] = []
  const fn = vi.fn(async (path: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${path}`
    const route = routes[key]
    calls.push({ key, body: init?.body ? JSON.parse(init.body as string) : undefined })
    if (!route) return Response.json({ message: `rota não mockada: ${key}` }, { status: 500 })
    if (route.status === 204) return new Response(null, { status: 204 })
    return Response.json(route.body ?? {}, { status: route.status ?? 200 })
  })
  vi.stubGlobal('fetch', fn)
  return calls
}
