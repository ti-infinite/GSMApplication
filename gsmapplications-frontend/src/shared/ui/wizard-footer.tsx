import { Button } from '@/shared/ui/button'

interface WizardFooterProps {
  /** Hint / summary on the left. Pass a fully-styled node (it owns its colors). */
  hint?:            React.ReactNode
  onBack?:          () => void
  backLabel?:       string
  primaryLabel:     string
  primaryIcon?:     React.ReactNode
  onPrimary:        () => void
  primaryDisabled?: boolean
}

/**
 * Consistent wizard footer.
 *
 * The hint/summary lives in its OWN slot (never shares a flex item with a
 * button), with `min-w-0` so it wraps instead of pushing the buttons. Back +
 * primary are grouped and `shrink-0`.
 *  - Mobile: hint on top, buttons in an even full-width row (grid).
 *  - Desktop: hint left, buttons auto-width on the right.
 */
export function WizardFooter({
  hint,
  onBack,
  backLabel,
  primaryLabel,
  primaryIcon,
  onPrimary,
  primaryDisabled,
}: WizardFooterProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0 sm:flex-1">{hint}</div>

      <div className={`shrink-0 gap-3 sm:flex ${onBack ? 'grid grid-cols-2' : 'flex'}`}>
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="w-full sm:w-auto">
            {backLabel}
          </Button>
        )}
        <Button onClick={onPrimary} disabled={primaryDisabled} className="w-full gap-2 sm:w-auto">
          {primaryIcon}
          {primaryLabel}
        </Button>
      </div>
    </div>
  )
}
