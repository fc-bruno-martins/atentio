import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/lib/test-utils'
import { CompanySettingsPage } from './company-settings-page'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('mostra e altera o prazo', async () => {
  const route = '/api/v1/company-settings'
  const calls = mockApi({
    [`GET ${route}`]: { body: { retention_days: 7 } },
    [`PUT ${route}`]: { body: { retention_days: 30 } },
  })
  renderWithQuery(<CompanySettingsPage />)
  const input = await screen.findByLabelText('Dias de retenção das mensagens')
  expect(input).toHaveValue(7)
  await userEvent.clear(input)
  await userEvent.type(input, '30')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(() =>
    expect(calls.find((c) => c.key === `PUT ${route}`)?.body).toEqual({ retention_days: 30 }),
  )
  expect(await screen.findByText('Prazo salvo.')).toBeInTheDocument()
})
