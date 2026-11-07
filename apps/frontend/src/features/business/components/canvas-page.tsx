'use client'

import { LayoutGrid } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CANVAS, COMPETITORS, EDGE, type CanvasBlockId } from '../services/content'

/** Posição de cada bloco na grade de 10 colunas do canvas clássico (telas largas). */
const PLACEMENT: Record<CanvasBlockId, string> = {
  parcerias: 'lg:col-start-1 lg:col-span-2 lg:row-start-1 lg:row-span-2',
  atividades: 'lg:col-start-3 lg:col-span-2 lg:row-start-1',
  recursos: 'lg:col-start-3 lg:col-span-2 lg:row-start-2',
  proposta: 'lg:col-start-5 lg:col-span-2 lg:row-start-1 lg:row-span-2',
  relacionamento: 'lg:col-start-7 lg:col-span-2 lg:row-start-1',
  canais: 'lg:col-start-7 lg:col-span-2 lg:row-start-2',
  segmento: 'lg:col-start-9 lg:col-span-2 lg:row-start-1 lg:row-span-2',
  custos: 'lg:col-start-1 lg:col-span-5 lg:row-start-3',
  receita: 'lg:col-start-6 lg:col-span-5 lg:row-start-3',
}

function BlockNumber({ value }: { value: number }) {
  return (
    <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary text-xs">
      {value}
    </span>
  )
}

export function CanvasPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <PageHeader
        title="Business Model Canvas"
        subtitle="Nenhum cliente esquecido pelo gestor de CS. Preço e canais são hipóteses a validar no piloto."
        icon={LayoutGrid}
      />

      <div className="grid gap-3 lg:grid-cols-10">
        {CANVAS.map((block) => (
          <Card
            key={block.id}
            role="region"
            aria-label={block.title}
            className={cn('p-4', PLACEMENT[block.id], block.id === 'proposta' && 'border-2 border-primary bg-accent/40')}
          >
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <BlockNumber value={block.number} />
              {block.title}
            </h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card role="region" aria-label="Concorrentes" className="flex flex-col gap-3 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <BlockNumber value={10} />
          Concorrentes
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {COMPETITORS.map((competitor) => (
            <div key={competitor.title}>
              <h3 className="text-sm font-semibold">{competitor.title}</h3>
              <p className="mb-1 text-xs text-muted-foreground">{competitor.who}</p>
              <p className="text-sm">{competitor.description}</p>
            </div>
          ))}
        </div>
        <p className="border-t border-border pt-3 text-sm">
          <strong>Diferencial:</strong> {EDGE}
        </p>
      </Card>
    </div>
  )
}
