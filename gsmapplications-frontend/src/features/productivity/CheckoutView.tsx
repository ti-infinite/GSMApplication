import { useState, useEffect, useRef } from 'react'
import { Plus, CheckCircle2, TrendingUp, Users, XCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { UnitCheckout } from './types'

const COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']

function formatTime(d: Date) {
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  units:      UnitCheckout[]
  onLap:      (trxId: string, amount: number) => void
  onWaste:    (trxId: string, waste: number) => void
  onComplete: (trxId: string) => void
  onCancel:   (trxId: string) => void
  onFinish:   () => void
}

export function CheckoutView({ units, onLap, onWaste, onComplete, onCancel, onFinish }: Props) {
  const [amounts,      setAmounts]      = useState<Record<string, string>>({})
  const [wasteInputs,  setWasteInputs]  = useState<Record<string, string>>({})
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  // Auto-finish when every remaining unit is completed
  useEffect(() => {
    if (units.length > 0 && units.every(u => completedIds.has(u.unit.trxId))) {
      onFinishRef.current()
    }
  }, [completedIds.size, units.length])

  const registerLap = (trxId: string) => {
    const raw    = amounts[trxId] ?? ''
    const amount = parseInt(raw, 10)
    if (!raw || isNaN(amount) || amount <= 0) return
    onLap(trxId, amount)
    setAmounts(prev => ({ ...prev, [trxId]: '' }))
  }

  const handleWasteChange = (trxId: string, val: string) => {
    const sanitized = val.replace(/[^0-9]/g, '')
    setWasteInputs(prev => ({ ...prev, [trxId]: sanitized }))
    const v = parseInt(sanitized, 10)
    onWaste(trxId, isNaN(v) ? 0 : v)
  }

  const handleComplete = (trxId: string) => {
    setCompletedIds(prev => new Set([...prev, trxId]))
    onComplete(trxId)
  }

  const totalAmount = units.reduce((s, u) => s + u.totalQty, 0)
  const activeCount = units.filter(u => u.laps.length > 0).length

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            En curso
          </span>
          <span className="text-muted-foreground">
            {units.length} {units.length === 1 ? 'unidad' : 'unidades'}
          </span>
        </div>
        {completedIds.size > 0 && completedIds.size < units.length && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {completedIds.size}/{units.length} completadas
          </span>
        )}
      </div>

      {/* ── Global summary ── */}
      {totalAmount > 0 && (
        <div className="flex flex-wrap items-stretch overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-1 items-center gap-3 px-6 py-4">
            <TrendingUp className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total producido</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{totalAmount}</p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-3 border-l border-border px-6 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Activas</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {activeCount}
                <span className="text-base font-normal text-muted-foreground">/{units.length}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Unit cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {units.map((u, idx) => (
          <UnitCard
            key={u.unit.trxId}
            unitCheckout={u}
            colorClass={COLORS[idx % COLORS.length]}
            inputValue={amounts[u.unit.trxId] ?? ''}
            wasteValue={wasteInputs[u.unit.trxId] ?? (u.waste > 0 ? String(u.waste) : '')}
            isCompleted={completedIds.has(u.unit.trxId)}
            onInputChange={val => setAmounts(prev => ({ ...prev, [u.unit.trxId]: val }))}
            onRegister={() => registerLap(u.unit.trxId)}
            onWasteChange={val => handleWasteChange(u.unit.trxId, val)}
            onComplete={() => handleComplete(u.unit.trxId)}
            onCancel={() => onCancel(u.unit.trxId)}
          />
        ))}
      </div>
    </div>
  )
}

function UnitCard({
  unitCheckout, colorClass, inputValue, wasteValue, isCompleted,
  onInputChange, onRegister, onWasteChange, onComplete, onCancel,
}: {
  unitCheckout:  UnitCheckout
  colorClass:    string
  inputValue:    string
  wasteValue:    string
  isCompleted:   boolean
  onInputChange: (v: string) => void
  onRegister:    () => void
  onWasteChange: (v: string) => void
  onComplete:    () => void
  onCancel:      () => void
}) {
  const { unit, laps, totalQty, waste } = unitCheckout
  const isMulti = unit.employees.length > 1
  const hasLaps = laps.length > 0

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all ${
      isCompleted ? 'border-green-500/40' : 'border-border'
    }`}>

      {/* ── 1. Identity + metrics corner ── */}
      <div className={`flex items-start justify-between gap-3 p-4 pb-3 ${isCompleted ? 'bg-green-500/5' : ''}`}>

        {/* Left: badge + name + employees */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white transition-colors ${
            isCompleted ? 'bg-green-500' : colorClass
          }`}>
            {isCompleted
              ? <CheckCircle2 className="h-5 w-5" />
              : isMulti ? <Users className="h-4 w-4" />
                        : unit.name.slice(0, 2).toUpperCase()
            }
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">{unit.name}</p>
            <p className="text-xs text-muted-foreground">
              {unit.employees.length} {unit.employees.length === 1 ? 'persona' : 'personas'}
            </p>
          </div>
        </div>

        {/* Right: cancel (top) + metrics recuadro (bottom) — stacked, right-aligned */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {!isCompleted && (
            <button
              type="button"
              onClick={onCancel}
              title="Cancelar transacción"
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
          <div className={`rounded-lg border px-2.5 py-1.5 text-right ${
            isCompleted
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-border bg-muted/20'
          }`}>
            <p className={`text-base font-bold tabular-nums leading-tight ${
              isCompleted ? 'text-green-600 dark:text-green-400' : 'text-foreground'
            }`}>{totalQty}</p>
            <p className={`text-[10px] font-semibold tabular-nums leading-tight ${
              waste > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/30'
            }`}>{waste || 0} <span className="font-normal opacity-70">waste</span></p>
          </div>
        </div>
      </div>

      {/* ── 2. Members ── */}
      <div className="flex flex-wrap gap-1 px-4 pb-3">
        {unit.employees.map(e => (
          <span key={e.id} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {e.name}
          </span>
        ))}
      </div>

      {/* ── 3. Product context ── */}
      <div className="mx-4 mb-4 rounded-lg border border-border/50 bg-muted/10 px-3 py-2">
        <p className="truncate text-xs font-medium text-foreground" title={unit.varietyName}>
          {unit.varietyName}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <span className="font-mono">{unit.sku}</span>
          <span className="select-none text-border">·</span>
          <span>Ini: <strong className="text-foreground">{unit.initialQty}</strong></span>
        </div>
      </div>

      {/* ── 5. Action zone — the functional hero of the card ── */}
      {!isCompleted ? (
        <div className="flex flex-col gap-2 px-4 pb-4">

          {/* Row 1: fields — cantidad (left) · desperdicio (right) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cantidad
              </label>
              <input
                type="number" min="1" step="1" inputMode="numeric"
                placeholder="0"
                value={inputValue}
                onChange={e => onInputChange(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && onRegister()}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Desperdicio
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

          {/* Row 2: buttons — +Lap (left, aligns with Cantidad) · Completar (right, aligns with Desperdicio) */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              onClick={onRegister}
              disabled={!inputValue || parseInt(inputValue, 10) <= 0}
              className="h-auto w-full gap-1.5 py-2.5">
              <Plus className="h-3.5 w-3.5" />
              Lap
            </Button>
            <Button
              variant="ghost"
              onClick={onComplete}
              disabled={!hasLaps}
              className="h-auto w-full gap-1.5 border border-green-500/30 py-2.5 text-sm text-green-600 hover:bg-green-500/10 hover:text-green-600 disabled:opacity-40 dark:text-green-400 dark:hover:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 px-4 pb-4 text-sm font-medium text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Unidad completada
        </div>
      )}

      {/* ── 5. Lap history — secondary, at the bottom ── */}
      {hasLaps && (
        <div className="mx-4 mb-4 overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Laps</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">{laps.length}</span>
          </div>
          <div className="flex max-h-28 flex-col overflow-y-auto">
            {laps.map((lap, i) => (
              <div key={lap.id}
                className="flex items-center gap-3 px-3 py-1.5 text-xs hover:bg-muted/30 not-last:border-b not-last:border-border/60">
                <span className="w-5 shrink-0 font-medium text-muted-foreground">#{i + 1}</span>
                <span className="flex-1 font-semibold text-foreground">{lap.amount}</span>
                <span className="text-muted-foreground">{formatTime(lap.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasLaps && !isCompleted && (
        <p className="mb-4 text-center text-xs text-muted-foreground">Sin laps registradas</p>
      )}
    </div>
  )
}