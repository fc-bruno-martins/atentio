import type { SVGProps } from 'react'

/**
 * Ícones dos conectores, desenhados em SVG simplificado com as cores de cada marca.
 * Aceitam as props de <svg>, inclusive x/y/width/height para uso dentro de outro SVG.
 */
type IconProps = SVGProps<SVGSVGElement>

export function WhatsAppIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path d="M12 2.2a9.6 9.6 0 0 0-8.3 14.5L2.4 21.6l5-1.3A9.6 9.6 0 1 0 12 2.2Z" fill="#25D366" />
      <path
        d="M8.6 7.1c.3-.3.8-.3 1 .1l1 1.7c.2.4.1.8-.2 1.1l-.6.5c.6 1.2 1.5 2.1 2.7 2.7l.5-.6c.3-.3.7-.4 1.1-.2l1.7 1c.4.2.4.7.1 1l-.8.8c-.6.6-1.6.8-2.4.4a10.6 10.6 0 0 1-5.4-5.4c-.4-.8-.2-1.8.4-2.4l.9-.7Z"
        fill="#fff"
      />
    </svg>
  )
}

export function SlackIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <rect x="7" y="2" width="3.4" height="10" rx="1.7" fill="#36C5F0" />
      <rect x="2" y="13.6" width="10" height="3.4" rx="1.7" fill="#E01E5A" />
      <rect x="13.6" y="12" width="3.4" height="10" rx="1.7" fill="#ECB22E" />
      <rect x="12" y="7" width="10" height="3.4" rx="1.7" fill="#2EB67D" />
      <circle cx="3.7" cy="8.7" r="1.7" fill="#36C5F0" />
      <circle cx="15.3" cy="3.7" r="1.7" fill="#2EB67D" />
      <circle cx="20.3" cy="15.3" r="1.7" fill="#ECB22E" />
      <circle cx="8.7" cy="20.3" r="1.7" fill="#E01E5A" />
    </svg>
  )
}

export function TeamsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <circle cx="19" cy="5.6" r="2.6" fill="#7B83EB" />
      <rect x="15.4" y="9.4" width="7.4" height="9" rx="2.6" fill="#7B83EB" />
      <circle cx="12.4" cy="4.4" r="3" fill="#5B5FC7" />
      <rect x="1.4" y="7.2" width="14.4" height="14.4" rx="3" fill="#5B5FC7" />
      <path d="M4.8 10.6h7.6v2H9.6v6.6H7.6v-6.6H4.8z" fill="#fff" />
    </svg>
  )
}

export function DiscordIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <rect x="1" y="2.5" width="22" height="19" rx="6" fill="#5865F2" />
      <path
        d="M7.4 7.6c3-1.4 6.2-1.4 9.2 0 1.3 1.9 2 4 2.1 6.5a9.9 9.9 0 0 1-3.6 1.9l-.8-1.3c-2.5.6-4.1.6-6.6 0l-.8 1.3A9.9 9.9 0 0 1 3.3 14c.1-2.4.8-4.5 2.1-6.4Z"
        fill="#fff"
      />
      <circle cx="9.4" cy="12.2" r="1.35" fill="#5865F2" />
      <circle cx="14.6" cy="12.2" r="1.35" fill="#5865F2" />
    </svg>
  )
}

export function ClickUpIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <defs>
        <linearGradient id="clickup-top" x1="4" y1="12" x2="20" y2="6">
          <stop offset="0" stopColor="#8930FD" />
          <stop offset="1" stopColor="#49CCF9" />
        </linearGradient>
        <linearGradient id="clickup-bottom" x1="4" y1="18" x2="20" y2="18">
          <stop offset="0" stopColor="#8930FD" />
          <stop offset="1" stopColor="#FF02F0" />
        </linearGradient>
      </defs>
      <path d="m4.5 12.5 7.5-6.2 7.5 6.2" stroke="url(#clickup-top)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.2 16.6c2.2 2.6 4.8 3.9 7.8 3.9s5.6-1.3 7.8-3.9" stroke="url(#clickup-bottom)" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  )
}

export function NotionIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path d="M4.2 3.4 15.6 2.5c1.4-.1 1.8 0 2.7.6l3.7 2.6c.6.4.8.6.8 1.1v13.6c0 .9-.3 1.4-1.5 1.5l-13.3.8c-.9 0-1.3-.1-1.8-.7L3.3 19c-.5-.7-.8-1.2-.8-1.9V4.9c0-.8.4-1.4 1.7-1.5Z" fill="#fff" stroke="#111" strokeWidth="1.2" />
      <path d="M8 8.2v10.1l1.6-.1V11l5.6 8.6 2.4-.2V7.6l-1.6.1v6.9L10.6 7.9 8 8.2Z" fill="#111" />
    </svg>
  )
}

export function JiraIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <defs>
        <linearGradient id="jira-a" x1="12" y1="6" x2="7" y2="11">
          <stop offset="0" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path d="M21.6 11.4 12.6 2.4 12 1.8 2.4 11.4a.8.8 0 0 0 0 1.2L8.6 18.8 12 22.2l9.6-9.6a.8.8 0 0 0 0-1.2ZM12 15.1 8.9 12 12 8.9l3.1 3.1L12 15.1Z" fill="#2684FF" />
      <path d="M12 8.9a5.2 5.2 0 0 1 0-7.1L5.2 8.6 8.9 12 12 8.9Z" fill="url(#jira-a)" />
    </svg>
  )
}

export function AzureDevOpsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path d="M22 5.3v12.9l-5.3 4.3-8.2-3v3l-4.6-6 13.4 1V5.1L22 5.3ZM17.3 6 9.8 1.5v3L3 6.5 1.9 8v8.1l2.9 1.2V7.5L17.3 6Z" fill="#0078D4" />
    </svg>
  )
}

export function GenericConnectorIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" aria-hidden {...props}>
      <path d="M8 12h8M12 8v8" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}
