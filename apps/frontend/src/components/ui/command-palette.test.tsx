import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { CommandPalette, useCommandShortcut, type Command } from './command-palette'

function Harness({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false)
  useCommandShortcut(() => setOpen((value) => !value))
  return <CommandPalette open={open} onOpenChange={setOpen} commands={commands} />
}

const commands = (run = vi.fn()): Command[] => [
  { id: 'a', label: 'Ir para Conversas', group: 'Navegar', run },
  { id: 'b', label: 'Ir para Análises', group: 'Navegar', run: vi.fn() },
]

it('abre com Ctrl+K, filtra e executa com Enter', async () => {
  const run = vi.fn()
  render(<Harness commands={commands(run)} />)
  expect(screen.queryByRole('dialog')).toBeNull()

  await userEvent.keyboard('{Control>}k{/Control}')
  const input = screen.getByRole('textbox', { name: 'Buscar ação' })
  expect(input).toHaveFocus()

  await userEvent.type(input, 'conv')
  expect(screen.getAllByRole('option')).toHaveLength(1)
  await userEvent.keyboard('{Enter}')

  expect(run).toHaveBeenCalledOnce()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('mostra aviso quando nada combina e fecha com Escape', async () => {
  render(<Harness commands={commands()} />)
  await userEvent.keyboard('{Control>}k{/Control}')
  await userEvent.type(screen.getByRole('textbox', { name: 'Buscar ação' }), 'xyz')
  expect(screen.getByText('Nenhuma ação encontrada.')).toBeInTheDocument()

  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
})
