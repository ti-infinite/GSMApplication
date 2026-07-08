import { useState, useEffect, useRef } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { TrendingUp, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { toast } from 'sonner'
import { toastApiError } from '@/shared/lib/toast'
import { CATEGORICAL_COLORS } from '@/shared/lib/palette'
import type { UnitCheckout } from '../model/types'
import { UnitCard, type CardConfirmation } from './UnitCard'

// A pending confirmation that needs the user's decision before completing a unit.
type Confirm =
  | { type: 'deviation'; trxId: string; finalLapAmount: number; finalLapWaste: number; deviation: 'less' | 'more'; expected: number; total: number }
  | { type: 'lapComplete'; trxId: string; expected: number }
  | null

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
      .catch((err) => {
        setCompletingIds(prev => { const n = new Set(prev); n.delete(trxId); return n })
        setCompletedIds(prev => { const n = new Set(prev); n.delete(trxId); return n })
        toastApiError(t('productivity.toast.completeFailed'), err)
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
              colorClass={CATEGORICAL_COLORS[(page * pageSize + idx) % CATEGORICAL_COLORS.length]}
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
