import { expect, it } from 'vitest'
import { meaningfulWords, motionEnabled } from './motion'

it('extrai termos com significado, sem repetir nem palavras vazias', () => {
  expect(meaningfulWords(['Bom dia, a proposta sai sexta!', 'proposta aprovada'])).toEqual([
    'Bom',
    'dia',
    'proposta',
    'sai',
    'sexta',
    'aprovada',
  ])
})

it('sem matchMedia não anima', () => {
  expect(motionEnabled()).toBe(false)
})
