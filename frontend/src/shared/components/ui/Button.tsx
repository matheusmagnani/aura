import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:     'bg-white text-app-bg hover:brightness-95',
        primary:     'bg-app-secondary text-app-primary hover:brightness-110',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        outline:     'border border-white/30 bg-transparent text-white hover:border-white/50',
        secondary:   'bg-app-primary text-white hover:bg-app-primary/80',
        ghost:       'text-white hover:bg-white/10',
        link:        'text-app-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-6 py-2',
        sm:      'h-8 rounded-lg gap-1.5 px-3 text-xs',
        lg:      'h-14 rounded-xl px-8 text-base',
        icon:    'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
