import * as React from "react"

import { cn } from "@/shared/lib/utils"

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }
>(({ className, orientation = "horizontal", ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="separator"
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
        className
      )}
      {...props}
    />
  )
})
Separator.displayName = "Separator"

export { Separator }
