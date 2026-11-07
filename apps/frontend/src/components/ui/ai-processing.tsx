'use client'

import { forwardRef, useEffect, useState } from 'react'

const DEFAULT_STEPS = [
  'Lendo as mensagens',
  'Separando participantes e assuntos',
  'Procurando decisões e pendências',
  'Escrevendo a análise',
]

/** Núcleo animado da IA. Também serve de alvo para as palavras que voam das mensagens. */
export const AiOrb = forwardRef<HTMLDivElement, { size?: number }>(function AiOrb(
  { size = 56 },
  ref,
) {
  return (
    <div ref={ref} className="fx-ai-orb" style={{ width: size, height: size }} aria-hidden>
      <span className="ring-c" />
      <span className="ring-a" />
      <span className="ring-b" />
      <span className="core" />
    </div>
  )
})

/**
 * Estado "IA trabalhando": orbe, etapas que avançam, palavras sendo lidas e barra de progresso.
 * As etapas são ilustrativas; o resultado real chega quando o provedor responde.
 */
export const AiProcessing = forwardRef<
  HTMLDivElement,
  { steps?: string[]; label?: string; words?: string[] }
>(function AiProcessing({ steps = DEFAULT_STEPS, label = 'IA processando', words = [] }, orbRef) {
  const [ticks, setTicks] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTicks((value) => value + 1), 200)
    return () => clearInterval(timer)
  }, [])

  const elapsed = ticks / 5
  const step = Math.min(Math.floor(elapsed / 2.2), steps.length - 1)
  const read = words.length ? Math.min(words.length, ticks) : 0
  const recent = words.slice(Math.max(0, read - 7), read)

  return (
    <div
      role="status"
      aria-live="polite"
      className="fx-scan fx-enter flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4"
    >
      <div className="flex items-center gap-4">
        <AiOrb ref={orbRef} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="fx-neon-text font-mono text-xs font-semibold tracking-widest uppercase">
              {label}
            </p>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {elapsed.toFixed(1)}s
            </span>
          </div>
          <ol className="flex flex-col gap-1 text-sm">
            {steps.map((text, index) => (
              <li
                key={text}
                className={
                  index < step
                    ? 'text-muted-foreground line-through decoration-primary/50'
                    : index === step
                      ? 'text-foreground'
                      : 'text-muted-foreground/50'
                }
              >
                <span className="mr-2 font-mono text-primary-ink">
                  {index < step ? '✓' : index === step ? '›' : '·'}
                </span>
                {text}
                {index === step && '…'}
              </li>
            ))}
          </ol>
        </div>
      </div>
      {words.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            <span>Termos lidos</span>
            <span className="tabular-nums">
              {read}/{words.length}
            </span>
          </div>
          <div className="fx-word-stream flex h-6 items-center gap-1.5 overflow-hidden">
            {recent.map((word, index) => (
              <span
                key={`${word}-${read - recent.length + index}`}
                className="fx-word-in shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary-ink"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="fx-ai-bar" />
    </div>
  )
})
