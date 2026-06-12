import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Plus, CheckCircle2, TrendingUp, Users, XCircle, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { toast } from 'sonner'
import type { UnitCheckout } from './types'

// Per-card confirmation rendered as an overlay on the card itself (not a full-screen modal).
interface CardConfirmation {
  tone:        'warning' | 'success'
  title:       string
  body:        ReactNode
  onAccept:    () => void
  onCancel:    () => void
}

// A pending confirmation that needs the user's decision before completing a unit.
type Confirm =
  | { type: 'deviation'; trxId: string; finalLapAmount: number; finalLapWaste: number; deviation: 'less' | 'more'; expected: number; total: number }
  | { type: 'lapComplete'; trxId: string; expected: number }
  | null

const COLORS        = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
const ROWS_PER_PAGE = 2

function usePageSize(): number {
  const compute = (): number => {
    const w    = window.innerWidth
    const cols = w >= 1536 ? 4 : w >= 1280 ? 3 : w >= 640 ? 2 : 1
    return Math.max(cols * ROWS_PER_PAGE, 4) // min 4 on mobile
  }
  const [size, setSize] = useState(compute)
  useEffect(() => {
    const handler = () => setSize(compute())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return size
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  units:      UnitCheckout[]
  onLap:      (trxId: string, amount: number, waste: number) => void
  onComplete: (trxId: string, finalLapAmount: number, finalLapWaste: number) => Promise<unknown> | void
  onCancel:   (trxId: string) => void
  onFinish:   () => void
}

export function CheckoutView({ units, onLap, onComplete, onCancel, onFinish }: Props) {
  const { t } = useTranslation()
  const [amounts,       setAmounts]       = useState<Record<string, string>>({})
  const [wasteInputs,   setWasteInputs]   = useState<Record<string, string>>({})
  const [completedIds,  setCompletedIds]  = useState<Set<string>>(new Set())
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())
  const [errors,        setErrors]        = useState<Record<string, string>>({})
  const [confirm,       setConfirm]       = useState<Confirm>(null)
  const [page,          setPage]          = useState(0)
  const pageSize = usePageSize()
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  // Auto-finish when every remaining unit is completed
  useEffect(() => {
    if (units.length > 0 && units.every(u => completedIds.has(u.unit.trxId))) {
      onFinishRef.current()
    }
  }, [completedIds.size, units.length])

  // Clamp page when a unit is cancelled or pageSize changes (resize)
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(units.length / pageSize) - 1)
    setPage(p => Math.min(p, maxPage))
  }, [units.length, pageSize])

  const clearError = (trxId: string) =>
    setErrors(prev => { const n = { ...prev }; delete n[trxId]; return n })

  // +Lap is strict: it can never exceed the remaining quantity.
  const registerLap = (trxId: string) => {
    const raw       = amounts[trxId] ?? ''
    const amount    = parseInt(raw, 10)
    if (!raw || isNaN(amount) || amount <= 0) return
    const unit      = units.find(u => u.unit.trxId === trxId)
    const remaining = unit ? unit.unit.initialQty - unit.totalQty : Infinity
    if (amount > remaining) {
      setErrors(prev => ({ ...prev, [trxId]: t('productivity.checkout.exceedsLimit', { remaining }) }))
      return
    }
    const waste = parseInt(wasteInputs[trxId] ?? '', 10) || 0
    clearError(trxId)
    onLap(trxId, amount, waste)
    setAmounts(prev => ({ ...prev, [trxId]: '' }))
    setWasteInputs(prev => ({ ...prev, [trxId]: '' }))
    // If this lap reaches the expected amount, suggest completing so the TRX doesn't stay open.
    if (unit && amount === remaining) {
      setConfirm({ type: 'lapComplete', trxId, expected: unit.unit.initialQty })
    }
  }

  // Complete is flexible: it may close with the laps already registered (no input) or
  // register a final lap — and it MAY exceed the expected amount (with confirmation).
  const registerComplete = (trxId: string) => {
    const unit = units.find(u => u.unit.trxId === trxId)
    if (!unit) return
    const raw            = amounts[trxId] ?? ''
    const finalLapAmount = raw ? parseInt(raw, 10) : 0
    if (raw && (isNaN(finalLapAmount) || finalLapAmount <= 0)) return   // invalid input
    if (finalLapAmount <= 0 && unit.laps.length === 0) return           // nothing to complete
    clearError(trxId)
    // Waste belongs to the final lap; ignored when there's no final quantity.
    const finalLapWaste = finalLapAmount > 0 ? (parseInt(wasteInputs[trxId] ?? '', 10) || 0) : 0

    const expected = unit.unit.initialQty
    const total    = unit.totalQty + finalLapAmount
    // Confirm only when the total deviates from what was expected.
    if (total < expected) { setConfirm({ type: 'deviation', trxId, finalLapAmount, finalLapWaste, deviation: 'less', expected, total }); return }
    if (total > expected) { setConfirm({ type: 'deviation', trxId, finalLapAmount, finalLapWaste, deviation: 'more', expected, total }); return }
    doComplete(trxId, finalLapAmount, finalLapWaste)
  }

  // Runs the actual completion (after confirmation, or directly when there's no deviation).
  const doComplete = (trxId: string, finalLapAmount: number, finalLapWaste: number) => {
    setConfirm(null)
    clearError(trxId)
    setCompletingIds(prev => new Set([...prev, trxId]))
    const request = onComplete(trxId, finalLapAmount, finalLapWaste)
    setAmounts(prev => ({ ...prev, [trxId]: '' }))
    setWasteInputs(prev => ({ ...prev, [trxId]: '' }))
    setTimeout(() => {
      setCompletingIds(prev => { const n = new Set(prev); n.delete(trxId); return n })
      setCompletedIds(prev => new Set([...prev, trxId]))
    }, 350)
    // Confirm on success; if the backend rejects, bring the card back and notify.
    Promise.resolve(request)
      .then(() => toast.success(t('productivity.toast.unitCompleted')))
      .catch(() => {
        setCompletingIds(prev => { const n = new Set(prev); n.delete(trxId); return n })
        setCompletedIds(prev => { const n = new Set(prev); n.delete(trxId); return n })
        toast.error(t('productivity.toast.completeFailed'))
      })
  }

  const acceptConfirm = () => {
    if (!confirm) return
    if (confirm.type === 'lapComplete') doComplete(confirm.trxId, 0, 0)
    else doComplete(confirm.trxId, confirm.finalLapAmount, confirm.finalLapWaste)
  }

  // Build the overlay confirmation for the card that currently has one pending.
  const confirmationFor = (trxId: string): CardConfirmation | undefined => {
    if (!confirm || confirm.trxId !== trxId) return undefined
    const onAccept = acceptConfirm
    const onCancel = () => setConfirm(null)
    const bold = { b: <strong className="font-semibold text-foreground" /> }  // numbers in bold, not parentheses
    if (confirm.type === 'lapComplete') {
      return {
        tone:  'success',
        title: t('productivity.checkout.confirmLapTitle'),
        body:  <Trans i18nKey="productivity.checkout.confirmLapBody" values={{ expected: confirm.expected }} components={bold} />,
        onAccept, onCancel,
      }
    }
    return {
      tone:  'warning',
      title: t('productivity.checkout.confirmDeviationTitle'),
      body:  <Trans
        i18nKey={confirm.deviation === 'less' ? 'productivity.checkout.confirmLessBody' : 'productivity.checkout.confirmMoreBody'}
        values={{ total: confirm.total, expected: confirm.expected }}
        components={bold}
      />,
      onAccept, onCancel,
    }
  }

  // Same exit animation as complete, then remove the unit from the list.
  const registerCancel = (trxId: string) => {
    setCompletingIds(prev => new Set([...prev, trxId]))
    setTimeout(() => {
      setCompletingIds(prev => { const n = new Set(prev); n.delete(trxId); return n })
      onCancel(trxId)
    }, 350)
  }

  // Waste is captured into the lap when +Lap / Completar is pressed (per vuelta),
  // so this only tracks the input value locally.
  const handleWasteChange = (trxId: string, val: string) => {
    const sanitized = val.replace(/[^0-9]/g, '')
    setWasteInputs(prev => ({ ...prev, [trxId]: sanitized }))
  }

  const totalAmount    = units.reduce((s, u) => s + u.totalQty, 0)
  // Units not yet completed (completingIds are still visible — animating out).
  const activeUnits    = units.filter(u => !completedIds.has(u.unit.trxId))
  const activeCount    = activeUnits.length   // "Active" = still open; drops as units are completed
  const totalPages     = Math.ceil(activeUnits.length / pageSize)
  const paginated      = activeUnits.slice(page * pageSize, (page + 1) * pageSize)
  const showPagination = activeUnits.length > pageSize

  // Checkout is always reachable now; show an empty state when there's nothing active.
  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t('productivity.checkout.empty')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            {t('productivity.checkout.inProgress')}
          </span>
          <span className="text-muted-foreground">
            {t('productivity.checkout.unit', { count: units.length })}
          </span>
          {showPagination && (
            <span className="text-muted-foreground/60">
              · {t('productivity.checkout.pageShort', { page: page + 1, total: totalPages })}
            </span>
          )}
        </div>
        {completedIds.size > 0 && completedIds.size < units.length && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {t('productivity.checkout.completedCount', { done: completedIds.size, total: units.length })}
          </span>
        )}
      </div>

      {/* ── Global summary ── */}
      {totalAmount > 0 && (
        <div className="flex flex-wrap items-stretch overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-1 items-center gap-3 px-6 py-4">
            <TrendingUp className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('productivity.checkout.totalProduced')}</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{totalAmount}</p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-3 border-l border-border px-6 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('productivity.checkout.active')}</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {activeCount}
                <span className="text-base font-normal text-muted-foreground">/{units.length}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Unit cards (paginated) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {paginated.map((u, idx) => (
          <div
            key={u.unit.trxId}
            className={`transition-all duration-300 ease-in-out ${
              completingIds.has(u.unit.trxId)
                ? 'pointer-events-none scale-95 opacity-0'
                : 'scale-100 opacity-100'
            }`}
          >
            <UnitCard
              unitCheckout={u}
              colorClass={COLORS[(page * pageSize + idx) % COLORS.length]}
              inputValue={amounts[u.unit.trxId] ?? ''}
              wasteValue={wasteInputs[u.unit.trxId] ?? ''}
              error={errors[u.unit.trxId]}
              onInputChange={val => {
                setAmounts(prev => ({ ...prev, [u.unit.trxId]: val }))
                clearError(u.unit.trxId)
              }}
              onRegister={() => registerLap(u.unit.trxId)}
              onWasteChange={val => handleWasteChange(u.unit.trxId, val)}
              onComplete={() => registerComplete(u.unit.trxId)}
              onCancel={() => registerCancel(u.unit.trxId)}
              confirmation={confirmationFor(u.unit.trxId)}
            />
          </div>
        ))}
      </div>

      {/* ── Pagination bar ── */}
      {showPagination && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0 || confirm !== null}
            className="gap-1.5 text-sm">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('productivity.common.previous')}</span>
          </Button>

          {/* Dots (< 5 pages) or numeric text (≥ 5 pages) */}
          {totalPages < 5 ? (
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    i === page
                      ? 'w-5 bg-primary'
                      : 'w-2 bg-border hover:bg-muted-foreground/40'
                  }`}
                />
              ))}
            </div>
          ) : (
            <span className="text-sm font-medium text-foreground">
              {page + 1}
              <span className="text-muted-foreground"> / {totalPages}</span>
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1 || confirm !== null}
            className="gap-1.5 text-sm">
            <span className="hidden sm:inline">{t('productivity.common.next')}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function UnitCard({
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