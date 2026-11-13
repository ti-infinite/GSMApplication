import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import type { DateRange } from 'react-day-picker'
import { ErrorState } from '@/shared/components/ErrorState'
import { Combobox } from '@/shared/ui/combobox'
import { FilterBar, FilterField } from '@/shared/ui/filter-bar'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { DateRangePicker } from '@/shared/ui/date-picker'
import { Button } from '@/shared/ui/button'
import { getTrxSeries, getTransaction, getFilteredSuppliers } from '@/shared/api/operations/endpoints'
import { getFilteredLocations } from '@/shared/api/application/endpoints'
import type {
  TrxSeriesDTOListApiResponse, TrxResponseDTOListApiResponse, TrxResponseDTO, SupplierDTOListApiResponse,
} from '@/shared/api/operations/model'
import type { LocationDTOListApiResponse } from '@/shared/api/application/model'
import { TrxPreviewDialog, dateOnly } from './TrxPreviewDialog'

// Catálogos para pintar códigos como nombres. En caché de React Query: abrir/cerrar el pop-up o
// volver a reportes no los vuelve a pedir. Si fallan, se muestran los códigos crudos.
const LOOKUP_STALE = 5 * 60 * 1000
const EMPTY_SERIES: { value: string; label: string }[] = []
const EMPTY_MAP: Record<string, string> = {}

function useTrxLookups(needSuppliers: boolean) {
  const { data: seriesData } = useQuery({
    queryKey: ['trxLookups', 'series'], staleTime: LOOKUP_STALE,
    queryFn: async () => {
      const list = ((await getTrxSeries()).data as TrxSeriesDTOListApiResponse | undefined)?.data ?? []
      const descr: Record<string, string> = {}   // prefix → descr, para el título del preview
      for (const s of list) if (s.prefix) descr[s.prefix] = s.descr ?? s.prefix
      return { options: list.map(s => ({ value: s.prefix ?? '', label: s.descr || (s.prefix ?? '') })), descr }
    },
  })
  const { data: locations = EMPTY_MAP } = useQuery({
    queryKey: ['trxLookups', 'locations'], staleTime: LOOKUP_STALE,
    queryFn: async () => {
      const list = ((await getFilteredLocations()).data as LocationDTOListApiResponse | undefined)?.data ?? []
      const map: Record<string, string> = {}
      for (const l of list) if (l.codeLocation) map[l.codeLocation] = l.descr ?? l.codeLocation
      return map
    },
  })
  // idSupplier → nameSupplier: solo lo usa el preview (ej. atributo IdSupplier de las OC).
  const { data: suppliers = EMPTY_MAP } = useQuery({
    queryKey: ['trxLookups', 'suppliers'], staleTime: LOOKUP_STALE, enabled: needSuppliers,
    queryFn: async () => {
      const list = ((await getFilteredSuppliers({})).data as SupplierDTOListApiResponse | undefined)?.data ?? []
      const map: Record<string, string> = {}
      for (const s of list) if (s.idSupplier) map[s.idSupplier] = s.nameSupplier ?? s.idSupplier
      return map
    },
  })

  return { series: seriesData?.options ?? EMPTY_SERIES, seriesDescr: seriesData?.descr ?? EMPTY_MAP, locations, suppliers }
}

/**
 * Búsqueda de transacciones por centro de costo + tipo + rango de fechas, con preview.
 * `prefix` fija el tipo (sin combo).
 * `rowActions` agrega botones por fila junto a "Visualizar".
 */
export function TrxDocumentSearch({ prefix, initialLocation = '', lockLocation = false, rowActions }: {
  prefix?:          string
  initialLocation?: string
  lockLocation?:    boolean
  rowActions?:      (trx: TrxResponseDTO) => ReactNode
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'reports' })
  const [selected,    setSelected]    = useState<TrxResponseDTO | null>(null)
  const { series, seriesDescr, locations, suppliers } = useTrxLookups(!!selected)
  const [location,    setLocation]    = useState(initialLocation)
  const [pickedType,  setPickedType]  = useState('')
  const [range,       setRange]       = useState<DateRange | undefined>(undefined)
  const [rows,        setRows]        = useState<TrxResponseDTO[]>([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<unknown>(null)
  const [reload,      setReload]      = useState(0)

  const trxPrefix = prefix ?? pickedType
  const locationName = (code?: string | null) => (code ? (locations[code] ?? code) : '')
  const locationOptions = Object.entries(locations).map(([value, label]) => ({ value, label }))
  const supplierName = (id?: string) => (id ? (suppliers[id] ?? '') : '')

  const filtersReady = !!(location && trxPrefix && range?.from && range?.to)

  useEffect(() => {
    if (!filtersReady || !range?.from || !range?.to) { setRows([]); return }
    let cancelled = false
    setLoading(true); setError(null)
    void getTransaction({
      trxPrefix,
      location,
      trxDateFrom: format(range.from, 'yyyy-MM-dd'),
      trxDateTo:   format(range.to,   'yyyy-MM-dd'),
    })
      .then(res => { if (!cancelled) setRows(((res.data as TrxResponseDTOListApiResponse | undefined)?.data ?? []) as TrxResponseDTO[]) })
      .catch(e => { if (!cancelled) setError(e) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filtersReady, location, trxPrefix, range?.from, range?.to, reload])

  const columns: TableColumn<TrxResponseDTO>[] = [
    { key: 'trxDocument', header: t('document') },
    { key: 'descr',       header: t('description') },
    { key: 'trxDate',     header: t('date'), render: r => dateOnly(r.trxDate) || '—' },
    { key: 'status',      header: t('status') },
    { key: 'location',    header: t('location'), render: r => locationName(r.location) || '—' },
    {
      key: 'actions', header: '',
      render: r => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSelected(r)}>
            <Eye className="h-3.5 w-3.5" /> {t('view')}
          </Button>
          {rowActions?.(r)}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <FilterBar toggleLabel={t('filters')}>
        <FilterField label={t('location')}>
          <Combobox options={locationOptions} value={location} onChange={setLocation} placeholder={t('selectLocation')} disabled={lockLocation} />
        </FilterField>
        {!prefix && (
          <FilterField label={t('type')}>
            <Combobox options={series} value={pickedType} onChange={setPickedType} placeholder={t('selectType')} />
          </FilterField>
        )}
        <FilterField label={t('dateRange')}>
          <DateRangePicker
            value={range} onChange={setRange} placeholder={t('selectDateRange')}
            applyLabel={t('applyDateRange')} clearLabel={t('clearDateRange')}
          />
        </FilterField>
      </FilterBar>

      {error ? (
        <ErrorState error={error} onRetry={() => setReload(k => k + 1)} />
      ) : (
        <DataTable
          columns={columns} data={rows} rowKey={r => String(r.idTrxHeader ?? r.trxDocument ?? '')}
          loading={loading} emptyMessage={filtersReady ? t('noResults') : t(prefix ? 'pickFiltersNoType' : 'pickFilters')}
        />
      )}

      <TrxPreviewDialog
        trx={selected} onClose={() => setSelected(null)} locationName={locationName} supplierName={supplierName}
        documentTypeName={(selected?.trxPrefix && seriesDescr[selected.trxPrefix]) || selected?.trxPrefix || ''}
      />
    </div>
  )
}
