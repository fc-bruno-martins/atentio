import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AiProcessing } from './ai-processing'

afterEach(() => vi.useRealTimers())

it('anuncia o processamento e avança as etapas com o tempo', () => {
  vi.useFakeTimers()
  render(<AiProcessing steps={['Lendo', 'Escrevendo']} />)
  expect(screen.getByRole('status')).toHaveTextContent('Lendo…')

  act(() => vi.advanceTimersByTime(2600))
  expect(screen.getByRole('status')).toHaveTextContent('Escrevendo…')
})
