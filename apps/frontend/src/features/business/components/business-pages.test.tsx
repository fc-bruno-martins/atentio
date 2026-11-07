import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { PITCH_DECK } from '../services/content'
import { CanvasPage } from './canvas-page'
import { PitchPage } from './pitch-page'

const slide = () => screen.getByRole('group', { name: /^Slide/ })

it('abre o pitch deck na capa e passa os slides pelos botões', async () => {
  render(<PitchPage />)

  expect(screen.getByRole('heading', { name: 'Pitch' })).toBeInTheDocument()
  expect(slide()).toHaveAccessibleName(`Slide 1 de ${PITCH_DECK.length}: Atentio`)
  expect(screen.getByRole('button', { name: 'Slide anterior' })).toBeDisabled()

  await userEvent.click(screen.getByRole('button', { name: 'Próximo slide' }))
  expect(within(slide()).getByText(/Qual delas está esperando resposta desde ontem/)).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /slide 3: Problema/ }))
  expect(within(slide()).getByRole('heading', { name: 'O relacionamento se perde no volume' })).toBeInTheDocument()
})

it('as setas trocam de slide e, nas pontas, deixam a tecla livre para o telão', () => {
  render(<PitchPage />)

  // Na capa, ← não tem para onde ir: a tecla segue livre.
  expect(fireEvent.keyDown(document, { key: 'ArrowLeft' })).toBe(true)
  expect(fireEvent.keyDown(document, { key: 'ArrowRight' })).toBe(false)
  expect(slide()).toHaveAccessibleName(/^Slide 2 de/)

  for (let i = 2; i < PITCH_DECK.length; i++) fireEvent.keyDown(document, { key: 'PageDown' })
  expect(within(slide()).getByText('Indicação de 3 times de CS para um piloto de 30 dias.')).toBeInTheDocument()
  expect(fireEvent.keyDown(document, { key: 'ArrowRight' })).toBe(true)
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
