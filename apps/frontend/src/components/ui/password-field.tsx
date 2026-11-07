'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function strength(value: string): number {
  if (!value) return 0
  let score = value.length >= 12 ? 2 : value.length >= 8 ? 1 : 0
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  return Math.min(score, 4)
}

const LEVELS = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']
const COLORS = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-primary', 'bg-primary']

/** Campo de senha com botão de mostrar e, opcionalmente, medidor de força. */
export function PasswordField({
  id,
  label,
  meter = false,
  ...input
}: Omit<ComponentProps<typeof Input>, 'type'> & { id: string; label: string; meter?: boolean }) {
  const [visible, setVisible] = useState(false)
  const [value, setValue] = useState('')
  const score = strength(value)
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          className="pr-9"
          onInput={(event) => setValue(event.currentTarget.value)}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary-ink"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {meter && value && (
        <div className="fx-enter flex items-center gap-2">
          <div className="flex flex-1 gap-1" aria-hidden>
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-300',
                  index < score ? COLORS[score] : 'bg-muted',
                )}
              />
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {value.length < 12 ? `${12 - value.length} caracteres a mais` : LEVELS[score]}
          </span>
        </div>
      )}
    </div>
  )
}
