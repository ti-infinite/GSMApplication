import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Calendar, Users, User } from 'lucide-react'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import type { UnitCheckout } from './types'

type DateFilter = 'today' | 'yesterday' | 'week' | 'all'

function startOfDay(d: Date) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

function formatDate(d: Date) {
  return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// Flatten UnitCheckout to rows for the table
interface HistorialRow {
  id:        string
  name:      string
  employees: string
  totalQty:  number
  waste:     number
  laps:      number
  lastLap:   Date | null
}

function toRows(units: UnitCheckout[]): HistorialRow[] {
  return units.map(u => ({
    id:        u.unit.trxId,
    name:      u.unit.name,
    employees: u.unit.employees.map(e => e.name).join(', '),
    totalQty:  u.totalQty,
    waste:     u.waste,
    laps:      u.laps.length,
    lastLap:   u.laps.at(-1)?.timestamp ?? null,
  }))
}

interface Props {
  units: UnitCheckout[]
}

export function HistorialView({ units }: Props) {
  const { t } = useTranslation()
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [search,     setSearch]     = useState('')

  const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
    { value: 'today',     label: t('productivity.history.today') },
    { value: 'yesterday', label: t('productivity.history.yesterday') },
    { value: 'week',      label: t('productivity.history.week') },
    { value: 'all',       label: t('productivity.history.all') },
  ]

  const rows = useMemo(() => {
    const now  = new Date()
    const week = new Date(now); week.setDate(now.getDate() - 7)

    return toRows(units).filter(r => {
      if (!r.lastLap) return dateFilter === 'all'

      const dateOk =
        dateFilter === 'all'       ? true
        : dateFilter === 'today'   ? isSameDay(r.lastLap, now)
        : dateFilter === 'yesterday' ? isSameDay(r.lastLap, new Date(now.setDate(now.getDate() - 1)))
        : r.lastLap >= week

      if (!dateOk) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return r.name.toLowerCase().includes(q) || r.employees.toLowerCase().includes(q)
    })
  }, [units, dateFilter, search])

  const totalProduced = rows.reduce((s, r) => s + r.totalQty, 0)
  const totalWaste    = rows.reduce((s, r) => s + r.waste, 0)

  const columns: TableColumn<HistorialRow>[] = [
    {
      key: 'name', header: t('productivity.history.colUnit'), sortable: true,
      render: r => (
        <div className="flex items-center gap-2">
          {r.laps > 0
            ? <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            : <User  className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <div>
            <p className="text-sm font-medium text-foreground">{r.name}</p>
            <p className="max-w-[180px] truncate text-xs text-muted-foreground">{r.employees}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'laps', header: t('productivity.history.colLaps'), sortable: true,
      render: r => <span className="text-sm text-foreground">{r.laps}</span>,
      hideMobile: true,
    },
    {
      key: 'totalQty', header: t('productivity.history.colProduced'), sortable: true,
      render: r => <span className="text-sm font-bold text-foreground">{r.totalQty}</span>,
    },
    {
      key: 'waste', header: t('productivity.history.colWaste'), sortable: true,
      render: r => <span className="text-sm text-muted-foreground">{r.waste}</span>,
      hideMobile: true,
    },
    {
      key: 'lastLap', header: t('productivity.history.colLastLap'),
      render: r => r.lastLap
        ? <span className="text-xs text-muted-foreground">{formatDate(r.lastLap)}</span>
        : <span className="text-xs text-muted-foreground">—</span>,
      hideMobile: true,
    },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* Stats */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-card px-6 py-3">
          <Stat label={t('productivity.history.statUnits')} value={String(rows.length)} />
          <Stat label={t('productivity.history.statTotalProduced')} value={String(totalProduced)} />
          <Stat label={t('productivity.history.statTotalWaste')} value={String(totalWaste)} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-wrap gap-1.5">
            {DATE_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setDateFilter(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  dateFilter === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder={t('productivity.history.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={r => r.id}
        emptyMessage={
          units.length === 0
            ? t('productivity.history.emptyNoRecords')
            : t('productivity.history.emptyNoMatch')
        }
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}