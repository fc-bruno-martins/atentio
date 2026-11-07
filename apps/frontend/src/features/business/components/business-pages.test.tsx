import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { CanvasPage } from './canvas-page'
import { PitchPage } from './pitch-page'

it('mostra o pitch com problema, solução, diferencial e pedido ao júri', () => {
  render(<PitchPage />)

  expect(screen.getByRole('heading', { name: 'Pitch' })).toBeInTheDocument()
  for (const title of ['Problema', 'Solução', 'Diferencial', 'Pedido ao júri']) {
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
  }
  expect(screen.getByText(/Qual delas está esperando resposta desde ontem/)).toBeInTheDocument()
  expect(screen.getByText('Indicação de 3 times de CS para um piloto de 30 dias.')).toBeInTheDocument()
})

it('mostra os nove blocos do canvas e os concorrentes', () => {
  render(<CanvasPage />)

  expect(screen.getByRole('heading', { name: 'Business Model Canvas' })).toBeInTheDocument()
  const blocks = [
    'Parcerias-chave',
    'Atividades-chave',
    'Recursos-chave',
    'Proposta de valor',
    'Relacionamento',
    'Canais',
    'Segmento de clientes',
    'Estrutura de custos',
    'Fontes de receita',
  ]
  for (const block of blocks) {
    expect(screen.getByRole('region', { name: block })).toBeInTheDocument()
  }
  expect(within(screen.getByRole('region', { name: 'Proposta de valor' })).getByText('Nenhum cliente esquecido')).toBeInTheDocument()
  expect(within(screen.getByRole('region', { name: 'Concorrentes' })).getByText('Alternativa atual')).toBeInTheDocument()
})
