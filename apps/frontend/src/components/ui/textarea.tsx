import * as React from 'react'
import { cn } from '@/lib/utils'

export const fieldClass =
  'w-full rounded-md border border-input bg-transparent text-sm text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_rgb(37_226_175/0.15)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClass, 'min-h-24 p-2.5', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(fieldClass, 'h-9 cursor-pointer px-2.5 dark:[&>option]:bg-popover', className)}
    {...props}
  />
))
NativeSelect.displayName = 'NativeSelect'
