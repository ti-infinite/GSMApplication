import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/shared/lib/utils'

const Popover        = PopoverPrimitive.Root
const PopoverTrigger  = PopoverPrimitive.Trigger
const PopoverAnchor   = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        // z-[60], no z-50: el sidebar (Sidebar.tsx) también es z-50 — con el mismo valor, quién
        // pinta encima queda a merced del orden del DOM (el portal del popover se agrega al body
        // después, así que "ganaba" por accidente, no a propósito). Un overlay transitorio SIEMPRE
        // debe ganarle a chrome persistente como el sidebar — patrón estándar (Material, Radix…).
        'z-60 w-auto rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg outline-none',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent }
