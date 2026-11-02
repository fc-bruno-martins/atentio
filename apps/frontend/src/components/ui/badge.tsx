import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      // Semantic tints share the board's token vocabulary (see taskFieldMeta):
      // `<token>/10` background + token foreground, so a Badge reads the same as
      // a task badge everywhere. default/outline stay solid for emphasis.
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-muted text-muted-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'border border-border text-foreground',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        // `brand` = tinta de marca; `highlight` = pílula verde, só para reconhecimento.
        brand: 'bg-accent text-accent-foreground',
        highlight: 'bg-primary text-primary-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
