import { type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border',
  {
    variants: {
      variant: {
        default: 'bg-ink-950/5 dark:bg-white/10 text-ink-950 dark:text-paper-100 border-transparent',
        emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        crimson: 'bg-crimson-500/10 text-crimson-500 border-crimson-500/20',
        amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        outline: 'bg-transparent border-ink-950/15 dark:border-white/15 text-ink-950 dark:text-paper-100',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
