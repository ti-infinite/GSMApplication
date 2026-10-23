import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CalendarIcon, Check, X } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { ErrorState } from '@/shared/components/ErrorState'
import { Combobox } from '@/shared/ui/combobox'
import { FilterBar, FilterField } from '@/shared/ui/filter-bar'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/ui/popover'
import { Calendar } from '@/shared/ui/calendar'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  useLogistics, useLogisticsFilterOptions, useSaveCarriers,
  type CarrierChange, type LogisticsFilters, type LogisticsRow,
} from '@/entities/logistics'

type Slot = 'CarrierA' | 'CarrierB'

const CARRIER_LIST_ID = 'logistics-carriers'
const toIsoDate = (d?: Date) => (d ? format(d, 'yyyy-MM-dd') : undefined)
// DateShip llega como yyyy-MM-dd: se formatea sin pasar por Date para no correr el día por zona horaria.
const formatShipDate = (value: string | null) => {
  const [y, m, d] = (value ?? '').slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : '—'
}
const sameChange = (a: CarrierChange, b: CarrierChange) =>
  (a.CarrierA ?? '') === (b.CarrierA ?? '') &&
  (a.CarrierB ?? '') === (b.CarrierB ?? '') &&
  (a.ConfirmedCarrier ?? '') === (b.ConfirmedCarrier ?? '')
const toChange = (r: LogisticsRow): CarrierChange =>
  ({ ID: r.ID, CarrierA: r.CarrierA, CarrierB: r.CarrierB, ConfirmedCarrier: r.ConfirmedCarrier })

export default function LogisticsPage() {
  const { t } = useTranslation(undefined, { keyPrefix: 'logistics' })

  const [whs,         setWhs]         = useState('')
  const [division,    setDivision]    = useState('')
  const [range,       setRange]       = useState<DateRange | undefined>(undefined)
  const [rangeOpen,   setRangeOpen]   = useState(false)
  const [stagedRange, setStagedRange] = useState<DateRange | undefined>(undefined)
  // Cambios pendientes por ID (sobreviven a cambiar de filtro hasta guardar o descartar).
  const [edits, setEdits] = useState<Record<number, CarrierChange>>({})

  const filters: LogisticsFilters = useMemo(() => ({
    whs:      whs || undefined,
    division: division || undefined,
    dateFrom: toIsoDate(range?.from),
    dateTo:   toIsoDate(range?.to ?? range?.from),
  }), [whs, division, range])
  const filtersReady = !!range?.from

  const { options } = useLogisticsFilterOptions()
  const { rows, isLoading, error, refetch } = useLogistics(filters, filtersReady)
  const save = useSaveCarriers()

  const viewRows = useMemo(() => rows.map(r => (edits[r.ID] ? { ...r, ...edits[r.ID] } : r)), [rows, edits])
  const originals = useMemo(() => new Map(rows.map(r => [r.ID, toChange(r)])), [rows])
  const pending = Object.values(edits)

  const carrierSuggestions = useMemo(() => {
    const names = new Set<string>()
    for (const r of [...rows, ...pending]) for (const n of [r.CarrierA, r.CarrierB]) if (n?.trim()) names.add(n.trim())
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [rows, pending])

  const applyChange = (row: LogisticsRow, next: CarrierChange) => setEdits(prev => {
    const copy = { ...prev }
    const original = originals.get(row.ID)
    if (original && sameChange(original, next)) delete copy[row.ID]
    else copy[row.ID] = next
    return copy
  })

  // Si el confirmado era el carrier que se edita, lo sigue (corregir un nombre no pierde la confirmación).
  const setCarrier = (row: LogisticsRow, slot: Slot, value: string) => {
    const current = toChange(row)
    const followsSlot = !!current.ConfirmedCarrier && current.ConfirmedCarrier === current[slot]
    applyChange(row, {
      ...current,
      [slot]: value || null,
      ConfirmedCarrier: followsSlot ? (value.trim() || null) : current.ConfirmedCarrier,
    })
  }

  const toggleConfirmed = (row: LogisticsRow, slot: Slot) => {
    const current = toChange(row)
    const candidate = current[slot]?.trim()
    if (!candidate) return
    applyChange(row, { ...current, ConfirmedCarrier: current.ConfirmedCarrier === candidate ? null : candidate })
  }

  const handleSave = () => {
    save.mutate(pending, {
      onSuccess: updated => { setEdits({}); toast.success(t('saved', { count: updated })) },
      onError:   () => toast.error(t('saveFailed')),
    })
  }

  const carrierInput = (row: LogisticsRow, slot: Slot) => (
    <Input
      value={row[slot] ?? ''}
      onChange={e => setCarrier(row, slot, e.target.value)}
      list={CARRIER_LIST_ID}
      placeholder={t('carrierPlaceholder')}
      aria-label={t(slot === 'CarrierA' ? 'carrierA' : 'carrierB')}
      className="w-44"
    />
  )

  const confirmedPicker = (row: LogisticsRow) => (
    <div className="flex flex-wrap gap-1.5">
      {(['CarrierA', 'CarrierB'] as const).map(slot => {
        const name = row[slot]?.trim()
        const selected = !!name && row.ConfirmedCarrier === name
        return (
          <button
            key={slot}
            type="button"
            disabled={!name}
            onClick={() => toggleConfirmed(row, slot)}
            aria-pressed={selected}
            className={`flex max-w-40 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/10'
            }`}
          >
            {selected && <Check className="h-3 w-3 shrink-0" />}
            <span className="truncate">{name || t(slot === 'CarrierA' ? 'carrierA' : 'carrierB')}</span>
          </button>
        )
      })}
    </div>
  )

  const columns: TableColumn<LogisticsRow>[] = [
    { key: 'WHS',      header: t('whs'),      sortable: true, render: r => r.WHS ?? '—' },
    { key: 'Division', header: t('division'), sortable: true, render: r => r.Division ?? '—' },
    {
      key: 'Invoice', header: t('invoice'), sortable: true,
      render: r => (
        <span className="flex items-center gap-1.5">
          {edits[r.ID] && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" title={t('unsaved')} />}
          {r.Invoice}
        </span>
      ),
    },
    { key: 'DateShip', header: t('dateShip'), sortable: true, render: r => formatShipDate(r.DateShip) },
    {
      key: 'Pallets', header: t('pallets'), sortable: true, align: 'right',
      render: r => (r.Pallets == null ? '—' : r.Pallets.toLocaleString(undefined, { maximumFractionDigits: 3 })),
    },
    { key: 'CarrierA',         header: t('carrierA'),  render: r => carrierInput(r, 'CarrierA') },
    { key: 'CarrierB',         header: t('carrierB'),  render: r => carrierInput(r, 'CarrierB') },
    { key: 'ConfirmedCarrier', header: t('confirmed'), render: confirmedPicker },
  ]

  const rangeLabel = range?.from
    ? range.to && !isSameDay(range.from, range.to)
      ? `${format(range.from, 'dd/MM/yyyy')} – ${format(range.to, 'dd/MM/yyyy')}`
      : format(range.from, 'dd/MM/yyyy')
    : t('selectDateRange')

  const toOptions = (values: string[]) => values.map(v => ({ value: v, label: v }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <FilterBar toggleLabel={t('filters')}>
        <FilterField label={t('whs')}>
          <Combobox options={toOptions(options.whs)} value={whs} onChange={setWhs} placeholder={t('allWhs')} />
        </FilterField>
        <FilterField label={t('division')}>
          <Combobox options={toOptions(options.divisions)} value={division} onChange={setDivision} placeholder={t('allDivisions')} />
        </FilterField>
        <FilterField label={t('dateRange')}>
          <div className="relative">
            <Popover open={rangeOpen} onOpenChange={o => { setRangeOpen(o); if (o) setStagedRange(range) }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-8 w-full justify-start gap-2 px-3.5 text-sm font-normal ${range?.from ? 'pr-8 text-foreground' : 'text-muted-foreground'}`}
                >
                  <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-left">{rangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={stagedRange} onSelect={setStagedRange} />
                <div className="border-t border-border p-2">
                  <Button className="w-full" onClick={() => { setRange(stagedRange); setRangeOpen(false) }}>
                    {t('applyDateRange')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {range?.from && (
              <button
                type="button"
                onClick={() => setRange(undefined)}
                aria-label={t('clearDateRange')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </FilterField>
      </FilterBar>

      {pending.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm font-medium text-foreground">{t('pendingChanges', { count: pending.length })}</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEdits({})} disabled={save.isPending}>
              {t('discard')}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={viewRows}
          rowKey={r => String(r.ID)}
          loading={isLoading}
          emptyMessage={filtersReady ? t('noResults') : t('pickFilters')}
          pageSize={25}
        />
      )}

      <datalist id={CARRIER_LIST_ID}>
        {carrierSuggestions.map(name => <option key={name} value={name} />)}
      </datalist>
    </div>
  )
}
