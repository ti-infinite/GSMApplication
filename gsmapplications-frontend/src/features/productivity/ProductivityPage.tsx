import { useState, useRef } from 'react'
import { ClipboardList, UserCheck, History } from 'lucide-react'
import { AssignmentWizard } from './AssignmentWizard'
import { CheckoutView } from './CheckoutView'
import { HistorialView } from './HistorialView'
import { buildTransactionPayload, buildUpdatePayload } from './transactionMapper'
import { createTransaction } from '@/shared/api/operations/operations/operations'
import type { AssignmentResult, UnitCheckout, LapRecord } from './types'

type View = 'assignment' | 'checkout' | 'historial'

function buildUnits(assignment: AssignmentResult, trxIds: string[]): UnitCheckout[] {
  const productCtx = {
    varietyName: assignment.variety.Name,
    sku:         assignment.product.SKU,
    initialQty:  assignment.initialQty,
  }

  if (assignment.mode === 'individual') {
    const employees = assignment.employeeGroups.flatMap(g => g.employees)
    return employees.map((emp, i) => ({
      unit:     { trxId: trxIds[i] ?? String(i), name: emp.name, employees: [emp], ...productCtx },
      laps:     [],
      waste:    0,
      totalQty: 0,
    }))
  }
  return assignment.employeeGroups.map((g, i) => ({
    unit:     { trxId: trxIds[i] ?? String(i), name: g.name, employees: g.employees, ...productCtx },
    laps:     [],
    waste:    0,
    totalQty: 0,
  }))
}

export default function ProductivityPage() {
  const [view,       setView]       = useState<View>('assignment')
  const [assignment, setAssignment] = useState<AssignmentResult | null>(null)
  const [units,      setUnits]      = useState<UnitCheckout[]>([])
  const startDateRef = useRef<Date>(new Date())

  const handleComplete = async (result: AssignmentResult) => {
    startDateRef.current = new Date()
    const payloads = buildTransactionPayload(result, startDateRef.current)
    console.log('[Productivity] create-trx payloads:', JSON.stringify(payloads, null, 2))

    let trxIds: string[] = payloads.map((_, i) => String(i + 1)) // placeholder until backend returns IDs
    try {
      await createTransaction(JSON.stringify(payloads))
      // TODO: read returned TRX IDs from response once backend implements it
      console.log('[Productivity] Transactions created:', trxIds.length)
    } catch (err) {
      console.error('[Productivity] create-trx error:', err)
    }

    const resultWithIds: AssignmentResult = { ...result, trxIds }
    setAssignment(resultWithIds)
    setUnits(buildUnits(resultWithIds, trxIds))
    setView('checkout')
  }

  const handleLap = (trxId: string, amount: number) => {
    const lap: LapRecord = { id: `${trxId}-${Date.now()}`, unitTrxId: trxId, amount, timestamp: new Date() }
    setUnits(prev => prev.map(u =>
      u.unit.trxId === trxId
        ? { ...u, laps: [...u.laps, lap], totalQty: u.totalQty + amount }
        : u,
    ))
  }

  const handleWaste = (trxId: string, waste: number) => {
    setUnits(prev => prev.map(u => u.unit.trxId === trxId ? { ...u, waste } : u))
  }

  const handleCancel = (trxId: string) => {
    setUnits(prev => prev.filter(u => u.unit.trxId !== trxId))
  }

  const handleFinish = async () => {
    if (!assignment) return
    const endDate  = new Date()
    const updates  = units.map(u => buildUpdatePayload(u, endDate))
    console.log('[Productivity] update payloads:', JSON.stringify(updates, null, 2))

    try {
      await Promise.all(updates.map(u => createTransaction(JSON.stringify([u]))))
      console.log('[Productivity] All TRX updated to Complete')
    } catch (err) {
      console.error('[Productivity] update error:', err)
    }

    setView('historial')
  }

  const checkoutLocked = !assignment

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Productivity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === 'assignment' ? 'Asignacion de productos, empleados y grower'
            : view === 'checkout'  ? 'Medicion de rendimiento en tiempo real'
                                   : 'Historial de registros'}
          </p>
        </div>
        <div className="flex rounded-lg border border-border">
          <Tab active={view === 'assignment'} onClick={() => setView('assignment')}
            icon={<ClipboardList className="h-4 w-4" />} label="Asignacion" />
          <Tab active={view === 'checkout'} onClick={() => !checkoutLocked && setView('checkout')}
            icon={<UserCheck className="h-4 w-4" />} label="Checkout"
            disabled={checkoutLocked} disabledTitle="Completa una asignacion primero" />
          <Tab active={view === 'historial'} onClick={() => setView('historial')}
            icon={<History className="h-4 w-4" />} label="Historial" />
        </div>
      </div>

      {view === 'assignment' && (
        assignment ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-6 py-4">
              <p className="text-sm font-semibold text-foreground">Asignacion activa</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                SKU <strong className="text-foreground">{assignment.skuPrefix}</strong>
                {' - '}Grower: {assignment.grower.name}
                {' - '}{assignment.employeeGroups.flatMap(g => g.employees).length} empleados
                {' - '}{units.length} TRX
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setView('checkout')}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Ir a Checkout
              </button>
              <button type="button" onClick={() => { setAssignment(null); setUnits([]) }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                Nueva asignacion
              </button>
            </div>
          </div>
        ) : (
          <AssignmentWizard onComplete={handleComplete} />
        )
      )}

      {view === 'checkout' && assignment && (
        <CheckoutView
          units={units}
          onLap={handleLap}
          onWaste={handleWaste}
          onComplete={() => {}}
          onCancel={handleCancel}
          onFinish={handleFinish}
        />
      )}

      {view === 'historial' && <HistorialView units={units} />}
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
