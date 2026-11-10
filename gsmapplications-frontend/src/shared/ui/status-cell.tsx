import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

export type StatusTone = 'green' | 'yellow' | 'red' | 'neutral'

// Same tinted-cell recipe as the Gross Margin cost breakdown (ZoneCell): soft semantic
// background + matching text, rounded-md, never a pill. Tokens only, no raw hex.
const TONE_CLASSES: Record<StatusTone, string> = {
  green: 'bg-success/15 text-success',
  yellow: 'bg-warning/15 text-warning',
  red: 'bg-destructive/15 text-destructive',
  neutral: 'border border-border bg-muted text-muted-foreground',
}

export function StatusCell({ tone, children, className, title }: { tone: StatusTone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-flex min-w-24 cursor-default items-center justify-center rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap', TONE_CLASSES[tone], className)}
    >
      {children}
    </span>
  )
}
