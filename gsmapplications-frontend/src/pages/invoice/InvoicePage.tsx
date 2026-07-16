import { useEffect, useState } from 'react'
import { TrxRuntime, buildRegistry } from '@/entities/trx'
import type { JsonConfig, Fetcher } from '@/entities/trx'
import { getConfig, saveConfig, getOrden, listOrdenes, saveFactura } from '@/shared/lib/idb'
import { Skeleton } from '@/shared/ui/skeleton'
import { toast } from 'sonner'
import { getMasterProducts, getCategories } from '@/shared/api/operations/endpoints'
import type { MasterProductDTOListApiResponse, StringApiResponse } from '@/shared/api/operations/model'

type Row = Record<string, unknown>
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Diccionario mock insumo → nombre SAP (mantenido; editable en la UI). Luego será
// tabla/endpoint. Por ahora normaliza el nombre al "idioma" de SAP (MAYÚSCULAS).
const sapNameFor = (varietyName: string) => varietyName.trim().toUpperCase().replace(/\s+/g, ' ')

const CENTROS = [
  { id: 'NRJ', name: 'Finca Naranjal' },
  { id: 'GUA', name: 'Guali' },
  { id: 'AGC', name: 'Agua Clara' },
  { id: 'NCD', name: 'Nacederos' },
]

/* ─────────────────────────── CONFIG (JSON) ─────────────────────────── */
const INV_CONFIG: JsonConfig = {
  prefix: 'FACCS',
  JsonFront: {
    title:    'Factura → SAP',
    subtitle: 'Ajusta presentaciones al diccionario SAP y exporta la factura para subirla.',
    rowKey:   'id',
    initCollection: 'main',
    components: [
      { type: 'filters', filters: [
        { key: 'centro',  label: 'Centro de costo', source: 'CENTROS',  optionValue: 'id',     optionLabel: 'name', cookieDefault: { field: 'location' } },
        { key: 'factura', label: 'Factura / Orden',  source: 'FACTURAS', optionValue: 'numero', optionLabel: 'numero' },
      ] },
      { type: 'stack', children: [
        { type: 'heading', title: 'Detalle de la factura', badge: 'facturaTotal' },
        { type: 'table', source: 'collection', rowKey: 'id',
          search: {
            source: 'CATALOG', optionValue: 'id', optionLabel: 'varietyName',
            label: 'Agregar insumo', placeholder: 'Buscar insumo…',
            cascade: [
              { key: 'category',    label: 'Categoría',    source: 'CATEGORIES', optionValue: 'IdCategory', optionLabel: 'Descr' },
              { key: 'subcategory', label: 'Subcategoría', dependsOn: 'category', optionsFrom: 'Children', optionValue: 'IdCategory', optionLabel: 'Descr' },
            ],
            prefixFrom: 'AggregatedCode', prefixField: 'sku',
          },
          fields: [
            { label: 'Insumo',     selectorValue: 'varietyName' },
            { label: 'Nombre SAP', selectorValue: 'sapName', renderer: 'textInput' },
            { label: 'Cant.',      selectorValue: 'qty', renderer: 'input' },
            { label: 'Precio',     selectorValue: 'precio', renderer: 'input' },
            { label: 'Total',      selectorType: 'COMPUTED', selectorValue: 'totalFmt' },
            { label: '',           selectorValue: 'split', renderer: 'splitButton' },
            { label: '',           selectorValue: 'rm',    renderer: 'removeAdded' },
          ],
        },
      ] },
      { type: 'note', text: 'Ajusta la cantidad, dividí una línea o agrega insumos para que la factura calce con las presentaciones de SAP. "Exportar a SAP" descarga el CSV.' },
      { type: 'actions', align: 'end', buttons: [
        { on: 'SAVE',   label: 'Guardar', variant: 'secondary' },
        { on: 'EXPORT', label: 'Exportar SAP (CSV)' },
      ] },
    ],
  },
  JsonREA: {
    resources: [
      { id: 'FACTURA_LINES', descr: 'Líneas de la factura', sourceType: 'API', cacheIn: 'INDEXED_DB',
        parameters: [ { key: 'factura', sourceType: 'CONTEXT', keyValue: 'factura', valueType: 'string' } ] },
    ],
    events: [], agents: [],
  },
  JsonWorkflow: {
    initialState: 'BORRADOR',
    states: ['BORRADOR', 'EMITIDA'],
    transitions: [
      { from: 'BORRADOR', to: 'BORRADOR', on: 'SAVE',   event: 'guardarFactura' },
      { from: 'EMITIDA',  to: 'EMITIDA',  on: 'SAVE',   event: 'guardarFactura' },
      { from: 'BORRADOR', to: 'EMITIDA',  on: 'EXPORT', event: 'exportSap' },
      { from: 'EMITIDA',  to: 'EMITIDA',  on: 'EXPORT', event: 'exportSap' },
    ],
  },
}

/* ─────────────────────────── FETCHERS ─────────────────────────── */
const centrosFetcher: Fetcher = async () => ({ success: 'true', message: '', data: CENTROS, traceId: null })

// Órdenes RECIBIDA (completas) → facturables.
const facturasFetcher: Fetcher = async () => {
  const list = await listOrdenes<{ numero: string; estado?: string }>()
  const data = list.filter(o => o.estado === 'RECIBIDA').map(o => ({ numero: o.numero }))
  return { success: 'true', message: '', data, traceId: null }
}

// Líneas de la factura (de la orden) + nombre SAP del diccionario (editable).
const facturaLinesFetcher: Fetcher = async (_id, params) => {
  const factura = params.factura ?? ''
  if (!factura) return { success: 'true', message: '', data: [], traceId: null }
  const orden = await getOrden<{ lines?: Array<{ id: string; varietyName: string; qty: number; precioUnit?: number }> }>(factura)
  const data = (orden?.lines ?? []).map(l => ({
    id: l.id, varietyName: l.varietyName, qty: l.qty, precio: l.precioUnit ?? 0,
    sapName: sapNameFor(l.varietyName),
  }))
  return { success: 'true', message: '', data, traceId: null }
}

// Categorías REALES (JSON string → parse) para el picker.
const categoriesFetcher: Fetcher = async () => {
  const res = await getCategories()
  let cats: unknown[] = []
  try { cats = JSON.parse((res.data as StringApiResponse).data ?? '[]') } catch { cats = [] }
  return { success: 'true', message: '', data: cats, traceId: null }
}

// Catálogo para "agregar insumo" — shape de línea de factura (agregada → borrable).
const catalogFetcher: Fetcher = async () => {
  const res = await getMasterProducts()
  const all = (res.data as MasterProductDTOListApiResponse | undefined)?.data ?? []
  const data = all.flatMap(p => (p.mv ?? []).map(v => ({
    id: `${p.sku ?? ''}-${v.idVariety ?? 0}`, varietyName: v.name ?? '',
    qty: 1, precio: 0, sapName: sapNameFor(v.name ?? ''), sku: p.sku ?? '', added: true,
  })))
  return { success: 'true', message: '', data, traceId: null }
}

/* ─────────────────────────── REGISTRY ─────────────────────────── */
const registry = buildRegistry({
  fetchers: { FACTURAS: facturasFetcher, FACTURA_LINES: facturaLinesFetcher, CENTROS: centrosFetcher, CATEGORIES: categoriesFetcher, CATALOG: catalogFetcher },
  computeds: {
    precioFmt:    row => money(Number(row.precio || 0)),
    totalFmt:     row => money(Number(row.qty || 0) * Number(row.precio || 0)),
    // Total de la factura (badge del heading) → para reconciliar el split.
    facturaTotal: row => {
      const items = (row.$items as Row[]) ?? []
      return `Total: ${money(items.reduce((s, l) => s + Number(l.qty || 0) * Number(l.precio || 0), 0))}`
    },
  },
  actions: {
    // Guarda la factura (borrador) en IndexedDB.
    guardarFactura: ({ collection, context }) => {
      const factura = String(context.factura ?? '')
      void saveFactura(factura || `FAC-${Date.now()}`, {
        factura,
        lines: collection.map(r => ({ id: r.id, varietyName: r.varietyName, sapName: r.sapName, qty: Number(r.qty || 0), precio: Number(r.precio || 0) })),
        createdAt: Date.now(),
      })
      toast.success('Factura guardada')
    },
    // Exporta la factura como CSV con los nombres SAP (para subir al tercero).
    exportSap: ({ collection, context }) => {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
      const header = 'nombre_sap,cantidad,precio_unit,total'
      const body = collection.map(r => {
        const qty = Number(r.qty || 0), precio = Number(r.precio || 0)
        return [esc(String(r.sapName ?? '')), qty, precio, qty * precio].join(',')
      }).join('\n')
      const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-sap-${String(context.factura || 'export')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Factura exportada para SAP (CSV)')
    },
  },
})

const CONFIG_ID = INV_CONFIG.prefix

export default function InvoiceTrxPage() {
  const [config, setConfig] = useState<JsonConfig | null>(null)
  useEffect(() => {
    void (async () => {
      await saveConfig(CONFIG_ID, INV_CONFIG, 'operations')
      setConfig(await getConfig<JsonConfig>(CONFIG_ID))
    })()
  }, [])

  if (!config) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }
  return <TrxRuntime config={config} registry={registry} />
}
