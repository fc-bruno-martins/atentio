'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, FormError } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { usePresets } from '@/features/shared'
import { NativeSelect } from '@/components/ui/textarea'
import { fetchAiSettings, saveAiSettings, type CompanyUser } from '../services/users'

export function AiSettingsDialog({ user, onClose }: { user: CompanyUser; onClose: () => void }) {
  const notify = useToast()
  const presets = usePresets()
  const { data, error } = useQuery({
    queryKey: ['ai-settings', user.id],
    queryFn: () => fetchAiSettings(user.id),
  })
  const mutation = useMutation({
    mutationFn: (values: FormData) => {
      const temperature = String(values.get('temperature'))
      return saveAiSettings(user.id, {
        model: String(values.get('model')),
        temperature: temperature ? Number(temperature) : null,
        extra_prompt: String(values.get('extra_prompt')),
      })
    },
    onSuccess: () => {
      notify('Configurações de análise salvas.')
      onClose()
    },
  })
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate(new FormData(event.currentTarget))
  }

  return (
    <Dialog open onClose={onClose} title={`Análises de ${user.name}`}>
      <FormError message={error?.message} />
      {data && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model">Modelo padrão da pessoa</Label>
            <NativeSelect id="model" name="model" defaultValue={data.model ?? ''}>
              <option value="">Padrão da plataforma</option>
              {presets.data?.presets.map((preset) => (
                <option key={preset.id} value={preset.model}>
                  {preset.label} · {preset.description}
                </option>
              ))}
              {data.model && !presets.data?.presets.some((p) => p.model === data.model) && (
                <option value={data.model}>Modelo personalizado</option>
              )}
            </NativeSelect>
          </div>
          <Field
            id="temperature"
            label="Temperatura (0 a 2)"
            type="number"
            step="0.1"
            min={0}
            max={2}
            defaultValue={data.temperature ?? ''}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="extra_prompt">Prompt adicional</Label>
            <Textarea
              id="extra_prompt"
              name="extra_prompt"
              defaultValue={data.extra_prompt ?? ''}
              placeholder="Instruções que valem para todas as análises desta pessoa."
            />
          </div>
          <FormError message={mutation.error?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            Salvar
          </Button>
        </form>
      )}
    </Dialog>
  )
}
