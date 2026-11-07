'use client'

import { ChevronLeft, ChevronRight, Presentation } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isFreeKey } from '@/components/layout/presentation'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PITCH_DECK } from '../services/content'
import { SlideView } from './slide'

const title = (index: number) => {
  const slide = PITCH_DECK[index]
  return slide ? (slide.kind === 'cover' ? slide.title : slide.eyebrow) : ''
}

/**
 * Pitch deck, um slide por vez. ← e → (ou PageUp e PageDown) trocam de slide; nas pontas a
 * tecla fica livre, e no modo telão segue para a tela vizinha do menu.
 */
export function PitchPage() {
  const [index, setIndex] = useState(0)
  const last = PITCH_DECK.length - 1

  useEffect(() => {
    // No `document`, para responder antes das setas do telão, que escutam a `window`.
    const onKey = (event: KeyboardEvent) => {
      if (!isFreeKey(event)) return
      const step =
        event.key === 'ArrowRight' || event.key === 'PageDown'
          ? 1
          : event.key === 'ArrowLeft' || event.key === 'PageUp'
            ? -1
            : 0
      const next = index + step
      if (!step || next < 0 || next > last) return
      event.preventDefault()
      setIndex(next)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, last])

  const slide = PITCH_DECK[index]
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <PageHeader
        title="Pitch"
        subtitle="Atentio para gestores de Customer Success. Use ← e → para passar os slides."
        icon={Presentation}
      />

      <section
        aria-roledescription="apresentação"
        aria-label="Pitch deck"
        // Em 16:9, a largura é limitada pela altura da janela para o slide caber inteiro.
        className="@container relative w-full self-center overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:aspect-video md:w-[min(100%,calc((100dvh-16rem)*16/9))]"
        data-slot="card"
      >
        <div
          key={index}
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${index + 1} de ${PITCH_DECK.length}: ${title(index)}`}
          className="fx-enter h-full p-[clamp(1.25rem,5cqw,5rem)]"
        >
          {slide && <SlideView slide={slide} />}
        </div>
        <span className="absolute right-[2cqw] bottom-[1.5cqw] font-mono text-[clamp(0.65rem,1.1cqw,0.95rem)] text-muted-foreground tabular-nums">
          {index + 1} / {PITCH_DECK.length}
        </span>
      </section>

      <nav aria-label="Slides" className="flex items-center justify-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Slide anterior"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <ol className="flex flex-wrap items-center justify-center gap-1.5">
          {PITCH_DECK.map((_, position) => (
            <li key={position}>
              <button
                type="button"
                aria-label={`Ir para o slide ${position + 1}: ${title(position)}`}
                aria-current={position === index ? 'step' : undefined}
                onClick={() => setIndex(position)}
                className={cn(
                  'block h-2 rounded-full transition-all',
                  position === index ? 'w-6 bg-primary' : 'w-2 bg-border hover:bg-muted-foreground',
                )}
              />
            </li>
          ))}
        </ol>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Próximo slide"
          disabled={index === last}
          onClick={() => setIndex(index + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </nav>
    </div>
  )
}
