import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, CheckCircle2, Users, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { UnitCheckout } from '../model/types'

// Per-card confirmation rendered as an overlay on the card itself (not a full-screen modal).
export interface CardConfirmation {
  tone:        'warning' | 'success'
  title:       string
  body:        ReactNode
  onAccept:    () => void
  onCancel:    () => void
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

export function UnitCard({
  unitCheckout, colorClass, inputValue, wasteValue, error, confirmation,
  onInputChange, onRegister, onWasteChange, onComplete, onCancel,
}: {
  unitCheckout:  UnitCheckout
  colorClass:    string
  inputValue:    string
  wasteValue:    string
  error?:        string
  confirmation?: CardConfirmation
  onInputChange: (v: string) => void
  onRegister:    () => void
  onWasteChange: (v: string) => void
  onComplete:    () => void
  onCancel:      () => void
}) {
  const { t } = useTranslation()
  const { unit, laps, totalQty, totalWaste } = unitCheckout
  const isMulti   = unit.employees.length > 1
  const hasLaps   = laps.length > 0
  const remaining = unit.initialQty - totalQty
  const lapAmount = parseInt(inputValue, 10)
  const hasInput  = !isNaN(lapAmount) && lapAmount > 0
  const lapValid      = hasInput && lapAmount <= remaining  // +Lap: strict, never exceeds
  const completeValid = hasInput || hasLaps                 // Complete: registers a final lap OR closes with existing laps

  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">

      {/* ── Confirmation overlay — anchored to the card, not the screen ── */}
      {confirmation && (
        <div className="absolute inset-0 z-20 flex animate-in fade-in zoom-in-95 flex-col items-center justify-center gap-3 rounded-xl bg-card/95 p-4 text-center backdrop-blur-sm duration-150">
          <span className={`flex h-11 w-11 items-center justify-center rounded-full ${
            confirmation.tone === 'success'
              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          }`}>
            {confirmation.tone === 'success'
              ? <CheckCircle2 className="h-6 w-6" />
              : <AlertTriangle className="h-6 w-6" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{confirmation.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{confirmation.body}</p>
          </div>
          <div className="flex w-full max-w-[260px] gap-2">
            <Button variant="ghost" size="sm" onClick={confirmation.onCancel}
              className="flex-1 border border-border">
              {t('productivity.checkout.confirmCancel')}
            </Button>
            <Button size="sm" onClick={confirmation.onAccept} className="flex-1 gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('productivity.checkout.confirmAccept')}
            </Button>
          </div>
        </div>
      )}


      {/* ── 1. Identity + metrics corner ── */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">

        {/* Left: badge + name + personas + member chips */}
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${colorClass}`}>
            {isMulti ? <Users className="h-4 w-4" /> : unit.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">{unit.name}</p>
            <p className="text-xs text-muted-foreground">
              {t('productivity.checkout.person', { count: unit.employees.length })}
            </p>
            {/* Member chips capped to ~2 rows with hidden scroll so the card height stays
                consistent regardless of group size (the count above gives the total). */}
            <div className="mt-1.5 flex max-h-[3.25rem] flex-wrap gap-1 overflow-y-auto scrollbar-hide">
              {unit.employees.map(e => (
                <span key={e.id} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {e.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: cancel (top) + metrics box (bottom) */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            title={t('productivity.checkout.cancelTrx')}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
          <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-right">
            <p className="text-xl font-bold tabular-nums leading-none text-foreground">{totalQty}</p>
            <p className={`text-[10px] font-semibold tabular-nums leading-tight ${
              totalWaste > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/30'
            }`}>{totalWaste || 0} <span className="font-normal opacity-70">{t('productivity.checkout.waste')}</span></p>
          </div>
        </div>
      </div>

      {/* ── 2. Product context ── */}
      <div className="mx-4 mb-4 rounded-lg border border-border/50 bg-muted/10 px-3 py-2">
        <p className="truncate text-xs font-medium text-foreground" title={unit.varietyName}>
          {unit.varietyName}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <span className="font-mono">{unit.sku}</span>
          <span className="select-none text-border">·</span>
          <span>{t('productivity.checkout.initialShort')} <strong className="text-foreground">{unit.initialQty}</strong></span>
          {remaining > 0 && (
            <span className="text-primary/70">· {t('productivity.checkout.remainingShort')} <strong className="text-primary">{remaining}</strong></span>
          )}
        </div>
      </div>

      {/* ── 3. Action zone ── */}
      <div className="flex flex-col gap-2 px-4 pb-4">

        {/* Row 1: Cantidad | Desperdicio */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('productivity.checkout.quantity')}
            </label>
            <input
              type="number" min="1" step="1" inputMode="numeric"
              placeholder="0"
              value={inputValue}
              onChange={e => onInputChange(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && onRegister()}
              className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                error ? 'border-destructive focus:ring-destructive/40' : 'border-border'
              }`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('productivity.checkout.wasteLabel')}
            </label>
            <input
              type="number" min="0" step="1" inputMode="numeric"
              placeholder="0"
              value={wasteValue}
              onChange={e => onWasteChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs font-medium text-destructive">{error}</p>
        )}

        {/* Row 2: +Lap | Completar */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={onRegister}
            disabled={!lapValid}
            className="h-auto w-full gap-1.5 py-2.5">
            <Plus className="h-3.5 w-3.5" />
            {t('productivity.checkout.lap')}
          </Button>
          <Button
            variant="ghost"
            onClick={onComplete}
            disabled={!completeValid}
            className="h-auto w-full gap-1.5 border border-green-500/30 py-2.5 text-sm text-green-600 hover:bg-green-500/10 hover:text-green-600 disabled:opacity-40 dark:text-green-400 dark:hover:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('productivity.checkout.complete')}
          </Button>
        </div>
      </div>

      {/* ── 4. Lap history ── */}
      {hasLaps && (
        <div className="mx-4 mb-4 overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('productivity.checkout.laps')}</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">{laps.length}</span>
          </div>
          <div className="flex max-h-28 flex-col overflow-y-auto">
            {laps.map((lap, i) => (
              <div key={lap.id}
                className="flex items-center gap-3 px-3 py-1.5 text-xs hover:bg-muted/30 not-last:border-b not-last:border-border/60">
                <span className="w-5 shrink-0 font-medium text-muted-foreground">#{i + 1}</span>
                <span className="flex-1 font-semibold text-foreground">{lap.amount}</span>
                {lap.waste > 0 && (
                  <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                    {lap.waste} {t('productivity.checkout.waste')}
                  </span>
                )}
                <span className="shrink-0 text-muted-foreground">{formatTime(lap.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasLaps && (
        <p className="mb-4 text-center text-xs text-muted-foreground">{t('productivity.checkout.noLaps')}</p>
      )}
    </div>
  )
}
