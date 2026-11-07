import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-[14px] font-semibold leading-none transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:border-ring focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'fx-btn-glow bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary:
          'bg-neutral-700 text-white hover:bg-neutral-600 dark:border-border dark:bg-secondary dark:hover:border-primary/40 dark:hover:bg-primary/10',
        outline:
          'bg-neutral-700 text-white hover:bg-neutral-600 dark:border-border dark:bg-secondary dark:hover:border-primary/40 dark:hover:bg-primary/10',
        ghost: 'text-foreground hover:bg-muted dark:hover:bg-muted/50',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        success: 'bg-success text-success-foreground hover:bg-success/90',
        link: 'text-primary-ink underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[34px] px-4',
        sm: 'h-[34px] px-4',
        lg: 'h-10 px-5',
        icon: 'size-[34px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
