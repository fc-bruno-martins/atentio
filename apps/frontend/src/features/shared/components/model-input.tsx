'use client'

import { useQuery } from '@tanstack/react-query'
import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'

interface ModelOption {
  id: string
  name: string
  input_price: number | null
  output_price: number | null
}

interface Models {
  models: ModelOption[]
  default_model: string | null
}

export const useModels = () =>
  useQuery({
    queryKey: ['analysis-models'],
    queryFn: () => apiFetch<Models>('/api/v1/analysis-models'),
    staleTime: 10 * 60 * 1000,
  })

function label({ name, input_price, output_price }: ModelOption): string {
  if (input_price === null || output_price === null) return `${name} · preço variável`
  if (input_price === 0 && output_price === 0) return `${name} · gratuito`
  return `${name} · US$ ${input_price} / US$ ${output_price} por 1M de tokens`
}

/** Campo com busca: são centenas de modelos, e a lista muda sem aviso. */
export function ModelInput({ id, ...input }: ComponentProps<typeof Input> & { id: string }) {
  const { data } = useModels()
  const listId = `${id}-options`
  return (
    <>
      <Input
        id={id}
        list={listId}
        placeholder="Busque por nome ou provedor"
        autoComplete="off"
        {...input}
      />
      <datalist id={listId}>
        {data?.models.map((model) => (
          <option key={model.id} value={model.id} label={label(model)} />
        ))}
      </datalist>
    </>
  )
}
