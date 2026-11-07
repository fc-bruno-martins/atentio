import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { channelLook } from '../services/channel-look'
import { ConnectorBadge } from './connector-badge'

it('mostra nome e ícone de cada conector', () => {
  for (const [id, name] of [
    ['whatsapp', 'WhatsApp'],
    ['slack', 'Slack'],
    ['teams', 'Microsoft Teams'],
    ['discord', 'Discord'],
    ['clickup', 'ClickUp'],
  ]) {
    const { container, unmount } = render(<ConnectorBadge channel={id!} />)
    expect(screen.getByText(name!)).toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeNull()
    unmount()
  }
  const icons = new Set(['whatsapp', 'slack', 'teams', 'discord', 'clickup'].map((id) => channelLook(id).icon))
  expect(icons.size).toBe(5)
})
