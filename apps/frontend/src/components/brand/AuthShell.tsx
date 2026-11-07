import type { ReactNode } from 'react'
import { AtentioMark } from '@/components/brand/AtentioMark'

/**
 * Casca das telas públicas (login, reset de senha): painel de marca à esquerda
 * e conteúdo à direita, como no login do DS (labs-feattalent: app/login).
 * A textura (ondas/partículas) e as formas em "F" são os motivos de fundo do
 * manual da marca, aproximados em SVG inline.
 */
function BrandTexture() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 800 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wave-fade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#25E2AF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#25E2AF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="url(#wave-fade)" fill="none" strokeWidth="1.2">
        <path d="M -50 620 C 150 560, 250 700, 450 640 S 750 520, 900 600" />
        <path d="M -50 700 C 180 640, 260 780, 470 710 S 760 600, 900 680" />
        <path d="M -50 780 C 160 730, 300 850, 480 790 S 780 690, 900 760" />
        <path d="M -50 850 C 200 810, 320 920, 500 870 S 800 780, 900 840" />
      </g>
    </svg>
  )
}

function BrandShape() {
  return (
    <svg
      className="absolute -right-16 -bottom-24 h-[420px] w-[420px] opacity-[0.07]"
      viewBox="0 0 200 180"
      aria-hidden="true"
    >
      <g stroke="#25E2AF" strokeWidth="3" fill="none" strokeLinejoin="round">
        <path d="M20 40 L90 40 L70 65 L140 65" />
        <path d="M10 80 L80 80 L60 105 L130 105" />
        <path d="M0 120 L70 120 L50 145 L120 145" />
      </g>
    </svg>
  )
}

function BrandPanel() {
  return (
    <div className="relative hidden w-[44%] max-w-md shrink-0 flex-col justify-between overflow-hidden bg-[#121212] px-12 py-10 lg:flex">
      <BrandTexture />
      <BrandShape />

      <div className="relative z-10 flex items-center gap-2.5">
        <AtentioMark className="h-[22px] w-auto" />
        <span className="text-lg font-semibold leading-none tracking-tight text-white">
          Atentio
        </span>
      </div>

      <div className="relative z-10 max-w-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#25E2AF]/25 bg-[#25E2AF]/10 px-2.5 py-1 text-xs font-medium text-[#25E2AF]">
          <span className="size-1.5 rounded-full bg-[#25E2AF]" />
          Plataforma
        </span>
        <p className="mt-5 text-[28px] font-medium leading-[1.2] text-white">
          Nada do seu WhatsApp fica para trás.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[#ADB1BA]">
          Conversas organizadas para você identificar o que precisa de atenção.
        </p>
      </div>

      <p className="relative z-10 text-xs text-[#6B7277]">
        © {new Date().getFullYear()} Atentio
      </p>
    </div>
  )
}

interface AuthShellProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center p-6 md:p-8">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <AtentioMark className="h-7 w-auto" />
              <span className="text-xl font-semibold leading-none tracking-tight text-foreground">
                Atentio
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>

          {children}

        </div>
      </div>
    </div>
  )
}
