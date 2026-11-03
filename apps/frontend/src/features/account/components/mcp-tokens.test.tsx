import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { McpTokens } from './mcp-tokens'

const ROUTE = '/api/v1/mcp-tokens'
const token = { id: 't1', name: 'Claude', created_at: '2026-11-02T12:00:00Z', last_used_at: null }

afterEach(() => {
  vi.unstubAllGlobals()
})

it('gera o token e mostra o comando uma vez', async () => {
  mockApi({
    [`GET ${ROUTE}`]: { body: [] },
    [`POST ${ROUTE}`]: { status: 201, body: { ...token, token: 'segredo123' } },
  })
  renderWithQuery(<McpTokens />)
  await userEvent.type(screen.getByLabelText('Nome do token'), 'Claude')
  await userEvent.click(screen.getByRole('button', { name: 'Gerar token' }))
  expect(await screen.findByText('segredo123')).toBeInTheDocument()
  expect(screen.getByText(/claude mcp add .*Bearer segredo123/)).toBeInTheDocument()
  expect(screen.getByText(/não será mostrado de novo/)).toBeInTheDocument()
})

it('lista e revoga', async () => {
  const calls = mockApi({
    [`GET ${ROUTE}`]: { body: [token] },
    [`DELETE ${ROUTE}/t1`]: { status: 204 },
  })
  renderWithQuery(<McpTokens />)
  expect(await screen.findByText('Ainda não usado')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Revogar' }))
  await waitFor(() => expect(calls.some((c) => c.key === `DELETE ${ROUTE}/t1`)).toBe(true))
})
