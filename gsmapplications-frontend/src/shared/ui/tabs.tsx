import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'

const Tabs = TabsPrimitive.Root

const tabsListVariants = cva(
  'relative inline-flex w-fit max-w-full shrink-0 items-center justify-start gap-0.5 overflow-x-auto p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-muted-foreground before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border data-[orientation=horizontal]:h-auto data-[orientation=vertical]:h-fit data-[orientation=vertical]:flex-col data-[variant=line]:rounded-none',
  {
    variants: {
      variant: {
        // The only variant actually in use (Gross Margin's module/sub-tabs)
        // -- a "folder tab" look: inactive tabs sit in a bordered bg-muted
        // box, the active one drops its bottom border and switches to
        // bg-background so it visually fuses with the panel below it.
        default: 'bg-transparent',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>
>(({ className, variant = 'default', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    data-variant={variant}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { variant?: 'default' | 'line' }
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // bg-muted and bg-background sit almost at the same lightness in
      // GSM's light theme (0.97 vs ~0.994 -- see design-system skill), so
      // the active/inactive split can't rely on that contrast alone, the
      // way the reference demo (dark theme) could. A primary-colored top
      // accent on the active tab is the signal that still reads regardless
      // -- also what the design system itself calls for ("selected tabs"
      // use primary).
      'relative inline-flex shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-t-md rounded-b-none border-x border-t-2 border-border bg-muted px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start hover:bg-muted/70 hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:z-10 data-[state=active]:border-t-primary! data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('flex-1 text-sm outline-none', className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
