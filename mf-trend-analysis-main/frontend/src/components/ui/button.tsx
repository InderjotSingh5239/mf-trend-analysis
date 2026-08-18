import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none',
  {
    variants: {
      variant: {
        default: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/20',
        secondary:
          'bg-ink-950/5 dark:bg-white/10 text-ink-950 dark:text-white hover:bg-ink-950/10 dark:hover:bg-white/15',
        outline:
          'border border-ink-950/15 dark:border-white/15 bg-transparent hover:bg-ink-950/5 dark:hover:bg-white/5 text-ink-950 dark:text-paper-100',
        ghost: 'hover:bg-ink-950/5 dark:hover:bg-white/10 text-ink-950 dark:text-paper-100',
        destructive: 'bg-crimson-500 text-white hover:bg-crimson-500/90',
        link: 'text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
)
Button.displayName = 'Button'
