import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList, UserCheck } from 'lucide-react'
import { AssignmentWizard } from './AssignmentWizard'
import { CheckoutView } from './CheckoutView'
import { buildTransactionPayload, buildLapPayload, buildCompletePayload, buildCancelPayload, mapTrxToUnits, type TrxResponseDTO } from './transactionMapper'
import { createTransaction, updateTransaction, getTransaction } from '@/shared/api/operations/operations/operations'
import { getStoredUser } from '@/shared/lib/auth'
import { Skeleton } from '@/shared/ui/skeleton'
import type { AssignmentResult, UnitCheckout, LapRecord } from './types'

// Pull the active (INPROGRESS) transactions from the backend and rebuild the
// checkout cards. This makes the checkout survive reloads (persistence).
async function loadActiveCheckout(): Promise<UnitCheckout[]> {
  const search = {
    trxPrefix: 'PRDLBR',
    status:    'INPROGRESS',
    location:  getStoredUser()?.location ?? undefined,
  }
  const res  = await getTransaction(search)
  const list = (res.data as unknown as { data?: TrxResponseDTO[] })?.data ?? []
  return mapTrxToUnits(list)
}

type View = 'assignment' | 'checkout'

export default function ProductivityPage() {
  const { t } = useTranslation()
  const [view,            setView]            = useState<View>('assignment')
  const [assignment,      setAssignment]      = useState<AssignmentResult | null>(null)
  const [units,           setUnits]           = useState<UnitCheckout[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const startDateRef = useRef<Date>(new Date())

  // Stale-while-revalidate: show what we already have, refresh from the DB in the
  // background. The skeleton only appears on the very first load (nothing to show yet).
  const refreshCheckout = async () => {
    setCheckoutLoading(units.length === 0)
    try { setUnits(await loadActiveCheckout()) }
    catch (err) { console.error('[Productivity] getTrx error:', err) }
    finally { setCheckoutLoading(false) }
  }

  const goToCheckout = () => {
    setView('checkout')
    void refreshCheckout()
  }

  const handleComplete = async (result: AssignmentResult) => {
    setAssignment(result)
    startDateRef.current = new Date()
    const payloads = buildTransactionPayload(result, startDateRef.current)
    console.log('[Productivity] create-trx payloads:', JSON.stringify(payloads, null, 2))

    // One create-trx call per unit (Promise.all preserves order).
    try {
      const responses = await Promise.all(payloads.map(p => createTransaction(p)))
      console.log('[Productivity] created TRX ids:', responses.map(r => r.data?.data))
    } catch (err) {
      console.error('[Productivity] create-trx error:', err)
    }

    goToCheckout()   // navigate + load the freshly created TRX from the DB
  }

  const handleLap = (trxId: string, amount: number) => {
    const timestamp = new Date()
    const lap: LapRecord = { id: `${trxId}-${timestamp.getTime()}`, unitTrxId: trxId, amount, timestamp }
    setUnits(prev => prev.map(u =>
      u.unit.trxId === trxId
        ? { ...u, laps: [...u.laps, lap], totalQty: u.totalQty + amount }
        : u,
    ))
    // PATCH appends one LAP detail. idTrxHeader (numeric) comes from getTrx.
    const payload = buildLapPayload(amount, timestamp)
    console.log('[Productivity] lap PATCH', trxId, JSON.stringify(payload))
    updateTransaction(Number(trxId), payload).catch(err =>
      console.error('[Productivity] lap error:', err),
    )
  }

  const handleUnitComplete = (trxId: string, finalLapAmount: number) => {
    const unit = units.find(u => u.unit.trxId === trxId)
    if (!unit) return
    const endDate = new Date()
    // A complete may register a final lap (finalLapAmount > 0) or just close the unit
    // with the laps already registered (finalLapAmount === 0).
    if (finalLapAmount > 0) {
      const lap: LapRecord = { id: `${trxId}-${endDate.getTime()}`, unitTrxId: trxId, amount: finalLapAmount, timestamp: endDate }
      setUnits(prev => prev.map(u =>
        u.unit.trxId === trxId
          ? { ...u, laps: [...u.laps, lap], totalQty: u.totalQty + finalLapAmount }
          : u,
      ))
    }
    const payload = buildCompletePayload(unit, finalLapAmount, endDate)
    console.log('[Productivity] complete PATCH', trxId, JSON.stringify(payload))
    updateTransaction(Number(trxId), payload).catch(err =>
      console.error('[Productivity] complete error:', err),
    )
  }

  const handleWaste = (trxId: string, waste: number) => {
    setUnits(prev => prev.map(u => u.unit.trxId === trxId ? { ...u, waste } : u))
  }

  const handleCancel = (trxId: string) => {
    setUnits(prev => prev.filter(u => u.unit.trxId !== trxId))
    // PATCH flips the TRX state to CANCELLED so it leaves the INPROGRESS set.
    const payload = buildCancelPayload()
    console.log('[Productivity] cancel PATCH', trxId, JSON.stringify(payload))
    updateTransaction(Number(trxId), payload).catch(err =>
      console.error('[Productivity] cancel error:', err),
    )
  }

  // Each unit already sent its own Complete payload when the user pressed "Completar".
  // Once they're all done, refresh from the DB so the completed ones drop off the list.
  const handleFinish = () => {
    void refreshCheckout()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('productivity.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === 'assignment' ? t('productivity.subtitles.assignment') : t('productivity.subtitles.checkout')}
          </p>
        </div>
        <div className="flex rounded-lg border border-border">
          <Tab active={view === 'assignment'} onClick={() => setView('assignment')}
            icon={<ClipboardList className="h-4 w-4" />} label={t('productivity.tabs.assignment')} />
          <Tab active={view === 'checkout'} onClick={goToCheckout}
            icon={<UserCheck className="h-4 w-4" />} label={t('productivity.tabs.checkout')} />
        </div>
      </div>

      {view === 'assignment' && (
        assignment ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-6 py-4">
              <p className="text-sm font-semibold text-foreground">{t('productivity.active.title')}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t('productivity.active.summary', {
                  sku:       assignment.skuPrefix,
                  grower:    assignment.growers.map(s => s.grower.name).join(', '),
                  employees: assignment.employeeGroups.flatMap(g => g.employees).length,
                  trx:       units.length,
                })}
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={goToCheckout}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                {t('productivity.active.goCheckout')}
              </button>
              <button type="button" onClick={() => { setAssignment(null); setUnits([]) }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                {t('productivity.active.new')}
              </button>
            </div>
          </div>
        ) : (
          <AssignmentWizard onComplete={handleComplete} />
        )
      )}

      {view === 'checkout' && (
        checkoutLoading
          ? <CheckoutSkeleton count={4} />
          : <CheckoutView
              units={units}
              onLap={handleLap}
              onWaste={handleWaste}
              onComplete={handleUnitComplete}
              onCancel={handleCancel}
              onFinish={handleFinish}
            />
      )}

    </div>
  )
}

function CheckoutSkeleton({ count }: { count: number }) {
  const cards = Math.max(count, 1)
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                  <div className="mt-1 flex gap-1">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
            </div>
            <Skeleton className="h-10 rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-9 rounded-lg" />
              <Skeleton className="h-9 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Tab({ active, onClick, icon, label, disabled, disabledTitle }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
  disabled?: boolean; disabledTitle?: string
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={disabled ? disabledTitle : undefined}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors first:rounded-l-[7px] last:rounded-r-[7px]
        ${active ? 'bg-primary text-primary-foreground'
        : disabled ? 'cursor-not-allowed bg-background text-muted-foreground/40'
                   : 'bg-background text-muted-foreground hover:bg-muted'}`}>
      {icon}{label}
    </button>
  )
}
