import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Download, CalendarIcon, X } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { ErrorState } from '@/shared/components/ErrorState'
import { Combobox } from '@/shared/ui/combobox'
import { FilterBar, FilterField } from '@/shared/ui/filter-bar'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { Dialog, DialogContent } from '@/shared/ui/dialog'
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/ui/popover'
import { Calendar } from '@/shared/ui/calendar'
import { Button } from '@/shared/ui/button'
import { pivotAttributes } from '@/entities/trx'
import { useTenant } from '@/app/providers/TenantProvider'
import { getTrxSeries, getTransaction, getFilteredSuppliers } from '@/shared/api/operations/endpoints'
import { getFilteredLocations } from '@/shared/api/application/endpoints'
import type {
  TrxSeriesDTOListApiResponse, TrxResponseDTOListApiResponse, TrxResponseDTO, SupplierDTOListApiResponse,
} from '@/shared/api/operations/model'
import type { LocationDTOListApiResponse } from '@/shared/api/application/model'

// Solo la fecha (sin hora) en la zona horaria LOCAL — trxDate llega en ISO/UTC.
const dateOnly = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '')

/* ───────────────────────────────────────────────────────────────────────────
 * Reportes/Histórico — NO es una TRX (no crea nada, no pasa por entities/trx
 * config-driven). Puramente consulta: s un tipo (trx-series) → tabla de
 * transacciones de ese tipo (filtered-trx por prefix, sin trxDocument) → clic
 * en una fila abre un preview genérico (cabecera + líneas, armado dinámicamente
 * desde trxAttributes/trxProductAttributes — sirve para CUALQUIER prefix sin
 * declarar columnas por tipo). "Descargar" = print-to-PDF nativo del navegador
 * sobre ese mismo preview, sin backend ni librería de PDF.
 * ─────────────────────────────────────────────────────────────────────────── */

// camelCase → "Camel Case" — las keys de pivotAttributes son arbitrarias (cualquier prefix),
// no hay un diccionario de labels central para ellas, así que se muestran así, legible sin traducir.
const titleCase = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase()).trim()

// Mismo layout que el documento que manda el backend por correo (trx_document.html,
// WeasyPrint) — pero con los TOKENS del tenant activo (var(--primary) etc.), no la paleta
// Agroaromas fija que usa el back (ahí no hay contexto de tenant al generar el email).
function TrxPreviewDialog({ trx, onClose, locationName, supplierName, documentTypeName }: {
  trx: TrxResponseDTO | null; onClose: () => void
  locationName: (code?: string | null) => string; supplierName: (id?: string) => string; documentTypeName: string
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'reports' })
  // Las keys de pivotAttributes son arbitrarias (cualquier prefix) — pero MUCHAS ya están
  // traducidas en el namespace 'trx' (price/productTotal/consumption/remaining/paymentMethod/
  // deliveryDate/observations…, las usa el motor TRX para sus propias columnas/filtros). Se
  // reusa ESE diccionario ya existente como fallback — si la key no está ahí, cae a titleCase.
  const { t: tTrx } = useTranslation(undefined, { keyPrefix: 'trx' })
  const translateKey = (k: string) => tTrx(k, { defaultValue: titleCase(k) })
  const { branding } = useTenant()
  if (!trx) return null
  const headerAttrs = Object.entries(pivotAttributes(trx.trxAttributes))
    .filter(([, v]) => v !== '')
    .map(([k, v]) => k === 'idSupplier'
      ? { key: k, label: t('supplier'), value: supplierName(v) || v }
      : { key: k, label: translateKey(k), value: v })
  const products = (trx.trxProducts ?? []).map(p => ({
    name:  p.varietyName ?? p.sku ?? '—',
    qty:   p.qty != null ? `${p.qty}${p.measurementUnit ? ' ' + p.measurementUnit : ''}` : '',
    attrs: pivotAttributes(p.trxProductAttributes),
  }))
  const columnKeys = Array.from(new Set(products.flatMap(p => Object.keys(p.attrs))))

  // Se arma UNA vez y se monta DOS veces: una visible en el Dialog (preview en pantalla) y
  // otra, oculta en pantalla, en un portal directo a <body> (fuera del Dialog/Portal de Radix)
  // que es la que efectivamente se imprime — ver comentario en @media print más abajo.
  const docBody = (
    <>
      <div className="rpt-header">
        <div className="rpt-brand">
          {branding.logo ? (
            <img src={branding.logo} alt="" className="rpt-logo" />
          ) : (
            <span className="rpt-logo rpt-logo-fallback">{branding.initials}</span>
          )}
          <div>
            <p className="rpt-eyebrow">{branding.name || t('title')}</p>
            <p className="rpt-title">{documentTypeName}</p>
          </div>
        </div>
        <div className="rpt-docnum-block">
          <p className="rpt-eyebrow">{t('document')}</p>
          <p className="rpt-docnum">{trx.trxDocument}</p>
        </div>
      </div>
      <div className="rpt-accent" />
      <div className="rpt-meta">
        <div><span className="rpt-meta-k">{t('date')}</span><span className="rpt-meta-v">{dateOnly(trx.trxDate) || '—'}</span></div>
        <div><span className="rpt-meta-k">{t('location')}</span><span className="rpt-meta-v">{locationName(trx.location) || '—'}</span></div>
        <div><span className="rpt-meta-k">{t('status')}</span><span className="rpt-meta-v">{trx.status ?? '—'}</span></div>
      </div>

      <div className="rpt-body">
        {headerAttrs.length > 0 && (
          <>
            <p className="rpt-section">{t('details')}</p>
            <div className="rpt-attrs">
              {headerAttrs.map(a => (
                <div key={a.key} className="rpt-attr">
                  <span className="rpt-meta-k">{a.label}</span>
                  <span className="rpt-attr-v">{a.value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="rpt-section">{t('lines')}</p>
        {products.length === 0 ? (
          <p className="rpt-empty">{t('noResults')}</p>
        ) : (
          <table className="rpt-table">
            <thead>
              <tr>
                <th>{t('variety')}</th>
                <th className="num">{t('qty')}</th>
                {columnKeys.map(k => <th key={k} className="num">{translateKey(k)}</th>)}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i}>
                  <td className="rpt-name">{p.name}</td>
                  <td className="num">{p.qty || '—'}</td>
                  {columnKeys.map(k => <td key={k} className="num">{p.attrs[k] || '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rpt-footer">
        <span>{t('title')}</span>
        <span>{trx.trxDocument} · {trx.username ?? ''}</span>
      </div>
    </>
  )

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 print:hidden">
        <div className="max-h-[85vh] overflow-y-auto">{docBody}</div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> {t('download')}
          </Button>
        </div>
      </DialogContent>
      {createPortal(
        <div id="trx-print-root" className="hidden print:block">{docBody}</div>,
        document.body
      )}
      <style>{`
        .rpt-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; background: var(--primary); padding: 18px 24px; }
        .rpt-brand { display: flex; align-items: center; gap: 12px; }
        .rpt-logo { width: 40px; height: 40px; border-radius: 8px; object-fit: contain; flex-shrink: 0; }
        .rpt-logo-fallback { display: flex; align-items: center; justify-content: center; background: color-mix(in oklch, var(--primary-foreground) 18%, transparent); color: var(--primary-foreground); font-size: 13px; font-weight: 700; }
        .rpt-eyebrow { margin: 0; color: color-mix(in oklch, var(--primary-foreground) 80%, transparent); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; }
        .rpt-title { margin: 2px 0 0; color: var(--primary-foreground); font-size: 19px; font-weight: 700; }
        /* margin-right: deja hueco para el botón de cerrar (absolute, top-right) del Dialog —
           sin esto "DOCUMENTO"/el número quedan debajo del X. */
        .rpt-docnum-block { text-align: right; margin-right: 40px; }
        .rpt-docnum { margin: 2px 0 0; color: var(--primary-foreground); font-size: 15px; font-weight: 700; white-space: nowrap; }
        .rpt-accent { height: 3px; background: var(--secondary); }
        .rpt-meta { display: flex; background: var(--muted); border-bottom: 1px solid var(--border); }
        .rpt-meta > div { flex: 1; padding: 10px 24px; border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 1px; }
        .rpt-meta > div:last-child { border-right: none; }
        .rpt-meta-k { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted-foreground); }
        .rpt-meta-v { font-size: 13px; font-weight: 700; color: var(--primary); }
        .rpt-body { padding: 20px 24px; }
        .rpt-section { margin: 0 0 10px; font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--primary); border-bottom: 1.5px solid var(--primary); padding-bottom: 5px; }
        .rpt-attrs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
        .rpt-attr { background: color-mix(in oklch, var(--primary) 12%, var(--card)); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; display: flex; flex-direction: column; gap: 1px; }
        .rpt-attr-v { font-size: 12px; font-weight: 700; color: var(--primary); }
        .rpt-empty { padding: 16px; text-align: center; color: var(--muted-foreground); font-style: italic; background: var(--muted); border: 1px solid var(--border); border-radius: 8px; }
        .rpt-table { width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .rpt-table th { background: var(--primary); color: var(--primary-foreground); text-align: left; font-size: 10px; letter-spacing: 0.5px; font-weight: 700; padding: 9px 12px; }
        .rpt-table td { padding: 9px 12px; border-bottom: 1px solid var(--border); color: var(--foreground); }
        .rpt-table tbody tr:nth-child(even) td { background: var(--muted); }
        .rpt-table tbody tr:last-child td { border-bottom: none; }
        .rpt-table th.num, .rpt-table td.num { text-align: right; white-space: nowrap; }
        .rpt-name { font-weight: 700; color: var(--primary); }
        .rpt-footer { display: flex; justify-content: space-between; padding: 10px 24px 18px; border-top: 1px solid var(--border); font-size: 9px; color: var(--muted-foreground); }
        /* #trx-print-root vive en un portal aparte, colgado directo de <body> (fuera del
           Portal/Overlay/transform de Radix Dialog) — así no hereda ningún position:fixed
           ni transform raro. Solo hay que ocultar el resto de la app (#root) y forzar que
           los fondos de color SÍ se impriman (Chrome los omite por defecto). */
        @media print {
          #root { display: none !important; }
          #trx-print-root, #trx-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </Dialog>
  )
}

export default function ReportsPage() {
  const { t } = useTranslation(undefined, { keyPrefix: 'reports' })
  const [series,       setSeries]       = useState<{ value: string; label: string }[]>([])
  const [seriesDescr,  setSeriesDescr]  = useState<Record<string, string>>({})   // prefix → descr, para el título del preview (sin el "(PREFIX)" del combo)
  const [locations,    setLocations]    = useState<Record<string, string>>({})
  const [suppliers,    setSuppliers]    = useState<Record<string, string>>({})   // idSupplier → nameSupplier, para el preview (ej. atributo IdSupplier de las OC)
  const [location,  setLocation]  = useState('')
  const [prefix,    setPrefix]    = useState('')
  const [range,     setRange]     = useState<DateRange | undefined>(undefined)
  const [rows,      setRows]      = useState<TrxResponseDTO[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<unknown>(null)
  const [selected,  setSelected]  = useState<TrxResponseDTO | null>(null)
  const [reload,    setReload]    = useState(0)

  // Nombre de la ubicación (ej. "NCD" → "Nacederos"). El endpoint de transacciones solo
  // trae el código; el nombre sale del endpoint de ubicaciones (mismo que usa el filtro FINCAS).
  const locationName = (code?: string | null) => (code ? (locations[code] ?? code) : '')
  const locationOptions = Object.entries(locations).map(([value, label]) => ({ value, label }))
  const supplierName = (id?: string) => (id ? (suppliers[id] ?? '') : '')

  useEffect(() => {
    void (async () => {
      try {
        const res = await getTrxSeries()
        const list = (res.data as TrxSeriesDTOListApiResponse | undefined)?.data ?? []
        setSeries(list.map(s => ({ value: s.prefix ?? '', label: s.descr ? `${s.descr} (${s.prefix})` : (s.prefix ?? '') })))
        const descrMap: Record<string, string> = {}
        for (const s of list) if (s.prefix) descrMap[s.prefix] = s.descr ?? s.prefix
        setSeriesDescr(descrMap)
      } catch { /* combo queda sin opciones */ }
    })()
    void (async () => {
      try {
        const res = await getFilteredLocations()
        const list = (res.data as LocationDTOListApiResponse | undefined)?.data ?? []
        const map: Record<string, string> = {}
        for (const l of list) if (l.codeLocation) map[l.codeLocation] = l.descr ?? l.codeLocation
        setLocations(map)
      } catch { /* fallback: se muestra el código tal cual */ }
    })()
    void (async () => {
      try {
        const res = await getFilteredSuppliers({})
        const list = (res.data as SupplierDTOListApiResponse | undefined)?.data ?? []
        const map: Record<string, string> = {}
        for (const s of list) if (s.idSupplier) map[s.idSupplier] = s.nameSupplier ?? s.idSupplier
        setSuppliers(map)
      } catch { /* fallback: se muestra el id crudo */ }
    })()
  }, [])

  // Los 3 filtros son obligatorios ANTES de pedir nada — sin fetch parcial por prefix solo.
  // location + prefix van directo a SearchTrx; la fecha necesita el rango COMPLETO (el backend
  // ignora TrxDateFrom/To si falta uno de los dos — deben llegar juntos).
  const filtersReady = !!(location && prefix && range?.from && range?.to)

  useEffect(() => {
    if (!filtersReady || !range?.from || !range?.to) { setRows([]); return }
    let cancelled = false
    setLoading(true); setError(null)
    void getTransaction({
      trxPrefix:   prefix,
      location,
      trxDateFrom: format(range.from, 'yyyy-MM-dd'),
      trxDateTo:   format(range.to,   'yyyy-MM-dd'),
    })
      .then(res => { if (!cancelled) setRows(((res.data as TrxResponseDTOListApiResponse | undefined)?.data ?? []) as TrxResponseDTO[]) })
      .catch(e => { if (!cancelled) setError(e) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filtersReady, location, prefix, range?.from, range?.to, reload])

  const columns: TableColumn<TrxResponseDTO>[] = [
    { key: 'trxDocument', header: t('document') },
    { key: 'descr',       header: t('description') },
    { key: 'trxDate',     header: t('date'), render: r => dateOnly(r.trxDate) || '—' },
    { key: 'status',      header: t('status') },
    { key: 'location',    header: t('location'), render: r => locationName(r.location) || '—' },
    {
      key: 'view', header: '',
      render: r => (
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSelected(r)}>
          <Eye className="h-3.5 w-3.5" /> {t('view')}
        </Button>
      ),
    },
  ]

  const rangeLabel = range?.from
    ? range.to && !isSameDay(range.from, range.to)
      ? `${format(range.from, 'dd/MM/yyyy')} – ${format(range.to, 'dd/MM/yyyy')}`
      : format(range.from, 'dd/MM/yyyy')
    : t('selectDateRange')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <FilterBar toggleLabel={t('filters')}>
        <FilterField label={t('location')}>
          <Combobox options={locationOptions} value={location} onChange={setLocation} placeholder={t('selectLocation')} />
        </FilterField>
        <FilterField label={t('type')}>
          <Combobox options={series} value={prefix} onChange={setPrefix} placeholder={t('selectType')} />
        </FilterField>
        <FilterField label={t('dateRange')}>
          <div className="relative">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-auto w-full justify-start gap-2 px-3.5 py-2.5 text-sm font-normal ${range?.from ? 'pr-8 text-foreground' : 'text-muted-foreground'}`}
                >
                  <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-left">{rangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={range} onSelect={setRange} />
              </PopoverContent>
            </Popover>
            {/* Fuera del trigger de Radix a propósito: anidado adentro, el click bubblea al
                <button> del Popover (Radix compone su propio onClick ahí) y reabre/cierra en
                vez de solo limpiar — un botón HERMANO no tiene ese problema. */}
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

      {/* La tabla queda montada SIEMPRE (headers fijos desde que entrás al módulo, igual que
          las TRX) — el mensaje de "faltan filtros" vs "sin resultados" lo resuelve el propio
          emptyMessage de DataTable, nunca se reemplaza el shell por otra cosa. */}
      {error ? (
        <ErrorState error={error} onRetry={() => setReload(k => k + 1)} />
      ) : (
        <DataTable
          columns={columns} data={rows} rowKey={r => String(r.idTrxHeader ?? r.trxDocument ?? '')}
          loading={loading} emptyMessage={filtersReady ? t('noResults') : t('pickFilters')}
        />
      )}

      <TrxPreviewDialog
        trx={selected} onClose={() => setSelected(null)} locationName={locationName} supplierName={supplierName}
        documentTypeName={(selected?.trxPrefix && seriesDescr[selected.trxPrefix]) || selected?.trxPrefix || ''}
      />
    </div>
  )
}
