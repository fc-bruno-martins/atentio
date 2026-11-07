import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Markdown, parseMarkdown } from './markdown'

it('separa títulos, listas, tarefas e parágrafos', () => {
  const blocks = parseMarkdown('## Resumo\nTudo certo.\n\n## Pendências\n- [ ] Enviar proposta — Ana\n- [x] Ligar')
  expect(blocks.map((block) => block.kind)).toEqual(['heading', 'paragraph', 'heading', 'list'])
  const list = blocks[3]
  expect(list?.kind === 'list' && list.items.map((item) => item.done)).toEqual([false, true])
})

it('renderiza negrito sem injetar HTML', () => {
  const { container } = render(<Markdown text={'Prazo **sexta** <script>x</script>'} />)
  expect(screen.getByText('sexta').tagName).toBe('STRONG')
  expect(container.querySelector('script')).toBeNull()
})
