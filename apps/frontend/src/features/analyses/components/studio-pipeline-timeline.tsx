'use client'

import { Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TimelineStep {
  label: string
  icon: LucideIcon
  /** Resumo do que foi escolhido na etapa. */
  summary?: string
}

/**
 * Linha do tempo horizontal do pipeline. Etapas concluídas podem ser clicadas
 * para voltar; a etapa atual pulsa e a linha até ela "corre".
 */
export function PipelineTimeline({
  steps,
  current,
  onGo,
}: {
  steps: TimelineStep[]
  current: number
  onGo: (index: number) => void
}) {
  return (
    <ol className="flex items-start" aria-label="Etapas da análise">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={step.label} className="flex flex-1 items-start last:flex-none">
            <button
              type="button"
              disabled={!done}
              onClick={() => onGo(index)}
              aria-current={active ? 'step' : undefined}
              className="group flex w-32 flex-col items-center gap-2 text-center disabled:cursor-default lg:w-44"
            >
              <span
                className={cn(
                  'grid size-12 place-items-center rounded-full border-2 transition-all duration-500 lg:size-14',
                  done && 'border-primary bg-primary text-primary-foreground group-hover:scale-110',
                  active && 'fx-node-active border-primary bg-background text-primary-ink',
                  !done && !active && 'border-border bg-background text-muted-foreground',
                )}
              >
                {done ? (
                  <Check className="size-5 lg:size-6" aria-hidden />
                ) : (
                  <step.icon className="size-5 lg:size-6" aria-hidden />
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  Etapa {index + 1}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold lg:text-base',
                    active ? 'text-foreground' : done ? 'text-primary-ink' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
                {step.summary && (
                  <span className="fx-enter line-clamp-2 text-xs text-muted-foreground">
                    {step.summary}
                  </span>
                )}
              </span>
            </button>
            {index < steps.length - 1 && (
              <span className="relative mt-6 h-0.5 flex-1 overflow-hidden rounded-full bg-border lg:mt-7">
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-700',
                    done ? 'w-full' : 'w-0',
                  )}
                />
                {active && <span className="fx-flow absolute inset-0" aria-hidden />}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
