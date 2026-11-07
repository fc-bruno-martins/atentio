'use client'

import { Presentation, Quote } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import { PITCH } from '../services/content'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <h2 className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{title}</h2>
      {children}
    </Card>
  )
}

export function PitchPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHeader title="Pitch" subtitle="Atentio para gestores de Customer Success, em uma página." icon={Presentation} />

      <Card className="flex flex-col gap-4 border-primary/40 p-6">
        <p className="text-xl leading-snug font-semibold text-foreground">{PITCH.headline}</p>
        <blockquote className="flex items-start gap-2 text-muted-foreground">
          <Quote aria-hidden className="mt-1 h-4 w-4 shrink-0 text-primary-ink" />
          <span className="italic">{PITCH.opening}</span>
        </blockquote>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Problema">
          <p>{PITCH.problem}</p>
        </Section>
        <Section title="Solução">
          <p>{PITCH.solution}</p>
          <ul className="list-disc space-y-1 pl-5">
            {PITCH.questions.map((question) => (
              <li key={question}>“{question}”</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{PITCH.solutionNote}</p>
        </Section>
        <Section title="Diferencial">
          <p>{PITCH.edge}</p>
        </Section>
        <Section title="Pedido ao júri">
          <p className="font-semibold">{PITCH.ask}</p>
        </Section>
      </div>
    </div>
  )
}
