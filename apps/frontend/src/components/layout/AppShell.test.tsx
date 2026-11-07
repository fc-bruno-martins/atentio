import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Home } from 'lucide-react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppShell, type NavItem } from './AppShell'

afterEach(() => window.localStorage.clear())

const MENU: NavItem[] = [
  { href: '/pitch', label: 'Pitch', icon: Home },
  { href: '/bmc', label: 'Canvas', icon: Home },
  { href: '/cerebro', label: 'Cérebro', icon: Home, separatorBefore: true },
]

function renderShell({
  items = [{ href: '/cerebro', label: 'Cérebro', icon: Home }],
  activeHref = '/cerebro',
  onNavigate,
}: { items?: NavItem[]; activeHref?: string; onNavigate?: (item: NavItem) => void } = {}) {
  return render(
    <AppShell
      items={items}
      activeHref={activeHref}
      userName="Ana"
      subtitle="Acme"
      onLogout={() => undefined}
      onNavigate={onNavigate}
      renderLink={(item, className, children) => (
        <a href={item.href} className={className}>
          {children}
        </a>
      )}
    >
      <input aria-label="Busca" />
    </AppShell>,
  )
}

it('recolhe e expande o menu, lembrando a escolha', async () => {
  const { unmount } = renderShell()
  await userEvent.click(screen.getByRole('button', { name: 'Recolher menu' }))
  expect(screen.getByRole('complementary')).toHaveAttribute('data-collapsed', 'true')
  expect(window.localStorage.getItem('atentio:menu-collapsed')).toBe('1')
  unmount()

  renderShell()
  expect(screen.getByRole('button', { name: 'Expandir menu' })).toBeInTheDocument()
})

it('desenha o separador antes do item marcado', () => {
  renderShell({ items: MENU.filter((item) => item.href !== '/bmc') })
  const nav = screen.getByRole('navigation', { name: 'Menu principal' })
  const separator = within(nav).getByRole('separator')
  expect(separator.nextElementSibling).toHaveTextContent('Cérebro')
  expect(separator.previousElementSibling).toHaveTextContent('Pitch')
})

it('no modo telão recolhe a barra lateral, marca a tela atual e põe os controles nela', async () => {
  renderShell({ items: MENU, activeHref: '/bmc', onNavigate: () => undefined })

  await userEvent.click(screen.getByRole('button', { name: 'Modo telão' }))
  const sidebar = screen.getByRole('complementary')
  expect(sidebar).toHaveAttribute('data-collapsed', 'true')
  expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  const nav = within(sidebar).getByRole('navigation', { name: 'Menu principal' })
  expect(within(nav).getByTitle('Canvas')).toHaveAttribute('aria-current', 'page')
  expect(within(nav).getByTitle('Pitch')).not.toHaveAttribute('aria-current')
  // Os controles ficam na barra lateral, fora da área da tela.
  const controls = within(sidebar).getByRole('toolbar', { name: 'Controles do telão' })
  expect(controls).toHaveTextContent('2/3')
  expect(screen.getByRole('main')).not.toContainElement(controls)
  expect(screen.queryByRole('button', { name: 'Recolher menu' })).not.toBeInTheDocument()
  // A preferência de menu expandido continua guardada.
  expect(window.localStorage.getItem('atentio:menu-collapsed')).toBeNull()
})

it('no modo telão as setas ← e → trocam de tela', async () => {
  const onNavigate = vi.fn()
  renderShell({ items: MENU, activeHref: '/bmc', onNavigate })
  await userEvent.click(screen.getByRole('button', { name: 'Modo telão' }))

  await userEvent.keyboard('{ArrowRight}')
  expect(onNavigate).toHaveBeenLastCalledWith(MENU[2])
  await userEvent.keyboard('{ArrowLeft}')
  expect(onNavigate).toHaveBeenLastCalledWith(MENU[0])
  // ↑ e ↓ ficam para a tela.
  await userEvent.keyboard('{ArrowDown}')
  expect(onNavigate).toHaveBeenCalledTimes(2)
})

it('no telão, o mouse navega pela barra e as setas dentro de um campo ficam com o campo', async () => {
  const onNavigate = vi.fn()
  renderShell({ items: MENU, activeHref: '/bmc', onNavigate })
  await userEvent.keyboard('t')

  await userEvent.click(screen.getByRole('button', { name: 'Próximo: Cérebro' }))
  expect(onNavigate).toHaveBeenLastCalledWith(MENU[2])

  await userEvent.click(screen.getByRole('textbox', { name: 'Busca' }))
  await userEvent.keyboard('{ArrowLeft}t')
  expect(onNavigate).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('toolbar', { name: 'Controles do telão' })).toBeInTheDocument()
})

it('sai do telão com Esc', async () => {
  renderShell({ items: MENU, onNavigate: () => undefined })
  await userEvent.click(screen.getByRole('button', { name: 'Modo telão' }))
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('toolbar', { name: 'Controles do telão' })).not.toBeInTheDocument()
  expect(screen.getByRole('complementary')).toHaveAttribute('data-collapsed', 'false')
  expect(screen.getByRole('banner')).toBeInTheDocument()
})

it('sem navegação, não oferece o modo telão', () => {
  renderShell()
  expect(screen.queryByRole('button', { name: 'Modo telão' })).not.toBeInTheDocument()
})

it('no telão, seta já usada pela tela (como no pitch deck) não troca de menu', async () => {
  const onNavigate = vi.fn()
  const consume = (event: KeyboardEvent) => event.preventDefault()
  document.addEventListener('keydown', consume)
  try {
    renderShell({ items: MENU, activeHref: '/bmc', onNavigate })
    await userEvent.click(screen.getByRole('button', { name: 'Modo telão' }))
    await userEvent.keyboard('{ArrowRight}')
    expect(onNavigate).not.toHaveBeenCalled()
  } finally {
    document.removeEventListener('keydown', consume)
  }
})
