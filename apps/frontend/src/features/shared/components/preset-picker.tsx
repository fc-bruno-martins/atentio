'use client'

import { useQuery } from '@tanstack/react-query'
import { Gauge, Rocket, Scale } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

export interface ModelPreset {
  id: string
  label: string
  description: string
  model: string
  input_price: number | null
  output_price: number | null
}

interface Presets {
  presets: ModelPreset[]
  default_preset: string
}

export const usePresets = () =>
  useQuery({
    queryKey: ['analysis-models'],
    queryFn: () => apiFetch<Presets>('/api/v1/analysis-models'),
    staleTime: 10 * 60 * 1000,
  })

const ICONS: Record<string, typeof Gauge> = { rapido: Rocket, equilibrado: Scale, profundo: Gauge }

/**
 * Nome do modelo na tela: o perfil (Rápido, Equilibrado, Profundo), sem marca de fornecedor.
 */
export function useModelName(): (model: string | null | undefined) => string {
  const { data } = usePresets()
  return (model) => {
    if (!model) return 'Código'
    const preset = data?.presets.find((item) => item.model === model)
    return preset ? `IA ${preset.label}` : 'IA personalizada'
  }
}

function price(preset: ModelPreset): string {
  if (preset.input_price === null || preset.output_price === null) return 'preço indisponível'
  return `US$ ${preset.input_price} / ${preset.output_price} por 1M tokens`
}

/** Escolha entre os modelos pré-selecionados: a pessoa escolhe o perfil, não o modelo. */
export function PresetPicker({
  value,
  onChange,
  label = 'Modelo',
}: {
  value: string
  onChange: (preset: string) => void
  label?: string
}) {
  const { data, isPending } = usePresets()
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-3">
      {isPending && [0, 1, 2].map((index) => <div key={index} className="feat-skeleton h-24 rounded-xl" />)}
      {data?.presets.map((preset) => {
        const Icon = ICONS[preset.id] ?? Gauge
        const active = value === preset.id
        return (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(preset.id)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5',
              active
                ? 'border-primary bg-primary/10 shadow-[0_0_20px_-8px_var(--neon-1)]'
                : 'border-border hover:border-primary/40',
            )}
          >
            <span className="flex items-center gap-2 font-semibold">
              <Icon className="size-4 text-primary-ink" aria-hidden />
              {preset.label}
            </span>
            <span className="text-xs text-muted-foreground">{preset.description}</span>
            <span className="mt-auto font-mono text-[10px] text-muted-foreground">
              {price(preset)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
