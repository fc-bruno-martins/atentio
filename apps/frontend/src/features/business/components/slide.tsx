'use client'

import { ArrowRight } from 'lucide-react'
import { AtentioMark } from '@/components/brand/AtentioMark'
import { cn } from '@/lib/utils'
import type { Slide, SlideCard } from '../services/content'

// Tamanhos em relação à largura do slide (`cqw`), para o mesmo slide servir no notebook e no telão.
const EYEBROW = 'font-mono text-[clamp(0.7rem,1.3cqw,1.1rem)] tracking-widest text-primary-ink uppercase'
const TITLE = 'text-[clamp(1.5rem,4cqw,3.75rem)] leading-tight font-bold tracking-tight text-foreground'
const BODY = 'text-[clamp(0.95rem,1.8cqw,1.6rem)] leading-snug'
const NOTE = 'text-[clamp(0.8rem,1.4cqw,1.2rem)] text-muted-foreground'

function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-[1.2cqw]">
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 className={TITLE}>{title}</h2>
      <div aria-hidden className="h-px w-[12cqw] bg-gradient-to-r from-primary via-[var(--neon-2)] to-transparent" />
    </div>
  )
}

function Card({ card, index }: { card: SlideCard; index?: number }) {
  return (
    <div className="flex flex-1 flex-col gap-[0.8cqw] rounded-[1.2cqw] border border-border bg-background/60 p-[2cqw]">
      {index !== undefined && (
        <span className="font-mono text-[clamp(0.7rem,1.2cqw,1rem)] text-primary-ink">0{index + 1}</span>
      )}
      <h3 className="text-[clamp(1rem,2cqw,1.8rem)] font-semibold text-foreground">{card.title}</h3>
      <p className={cn(BODY, 'text-muted-foreground')}>{card.text}</p>
    </div>
  )
}

/** Um slide do pitch deck; o layout depende do tipo. */
export function SlideView({ slide }: { slide: Slide }) {
  switch (slide.kind) {
    case 'cover':
      return (
        <div className="flex h-full flex-col justify-center gap-[2cqw]">
          <AtentioMark animated className="h-[6cqw] w-auto self-start drop-shadow-[0_0_14px_rgb(37_226_175/0.6)]" />
          <h2 className="fx-neon-text text-[clamp(2.5rem,9cqw,8rem)] leading-none font-bold tracking-tight">
            {slide.title}
          </h2>
          <p className="text-[clamp(1.1rem,2.8cqw,2.5rem)] font-semibold text-foreground">{slide.subtitle}</p>
          <p className={NOTE}>{slide.tagline}</p>
        </div>
      )
    case 'statement':
      return (
        <div className="flex h-full flex-col justify-center gap-[2cqw]">
          <p className={EYEBROW}>{slide.eyebrow}</p>
          <h2 className="text-[clamp(1.75rem,5.2cqw,4.75rem)] leading-tight font-bold tracking-tight text-foreground">
            {slide.title}
          </h2>
          {slide.subtitle && <p className={NOTE}>{slide.subtitle}</p>}
        </div>
      )
    case 'bullets':
      return (
        <div className="flex h-full flex-col justify-center gap-[3cqw]">
          <Heading eyebrow={slide.eyebrow} title={slide.title} />
          <ul className={cn(BODY, 'flex flex-col gap-[1.4cqw]')}>
            {slide.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-[1.2cqw]">
                <span aria-hidden className="mt-[0.7cqw] size-[0.8cqw] min-h-2 min-w-2 shrink-0 rounded-full bg-primary" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {slide.note && <p className={NOTE}>{slide.note}</p>}
        </div>
      )
    case 'cards':
      return (
        <div className="flex h-full flex-col justify-center gap-[3cqw]">
          <Heading eyebrow={slide.eyebrow} title={slide.title} />
          <div className="flex flex-col gap-[1.6cqw] md:flex-row">
            {slide.cards.map((card) => (
              <Card key={card.title} card={card} />
            ))}
          </div>
          {slide.note && <p className={NOTE}>{slide.note}</p>}
        </div>
      )
    case 'flow':
      return (
        <div className="flex h-full flex-col justify-center gap-[3cqw]">
          <Heading eyebrow={slide.eyebrow} title={slide.title} />
          <ol className="flex flex-col items-stretch gap-[1cqw] md:flex-row">
            {slide.steps.map((step, index) => (
              <li key={step.title} className="flex flex-1 flex-col items-stretch gap-[1cqw] md:flex-row">
                <Card card={step} index={index} />
                {index < slide.steps.length - 1 && (
                  <ArrowRight aria-hidden className="size-[2.4cqw] min-h-4 min-w-4 shrink-0 self-center text-primary-ink max-md:rotate-90" />
                )}
              </li>
            ))}
          </ol>
          {slide.note && <p className={NOTE}>{slide.note}</p>}
        </div>
      )
  }
}
