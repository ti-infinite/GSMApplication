import { useEffect, useState } from 'react'
import { TrxRuntime, buildRegistry } from '@/entities/trx'
import type { JsonConfig, Fetcher } from '@/entities/trx'
import { getConfig, saveConfig, clearResourcePrefix } from '@/shared/lib/idb'
import { ensureSeeded, getStock, receive } from '@/entities/inventory/inventory'
import { getStoredUser } from '@/shared/lib/auth'
import { Skeleton } from '@/shared/ui/skeleton'
import { toast } from 'sonner'
import { getCategories, getMasterProducts } from '@/shared/api/operations/endpoints'
import type { StringApiResponse, MasterProductDTOListApiResponse } from '@/shared/api/operations/model'

type Row = Record<string, unknown>
const num = (v: unknown) => Number(v ?? 0) || 0

const FINCAS = [
  { location: 'NRJ', name: 'Finca Naranjal' },
  { location: 'GUA', name: 'Guali' },
  { location: 'AGC', name: 'Agua Clara' },
  { location: 'NCD', name: 'Nacederos' },
]

/* ─────────────────────────── CONFIG (JSON) ─────────────────────────── */
const ADJ_CONFIG: JsonConfig = {
  prefix: 'AJUCS',
  JsonFront: {
    title:    'Ajustes inventarios',
    subtitle: 'Gestión y corrección de niveles de stock por ubicación.',
    rowKey:   'id',
    derive:   [{ key: 'skuPrefix', compute: 'skuPrefix' }],
    headerButtons: [{ on: 'EXPORT', label: 'Exportar' }],
    components: [
      { type: 'filters', filters: [
        { key: 'location',    label: 'Ubicación',    source: 'FINCAS',     optionValue: 'location',   optionLabel: 'name', cookieDefault: { field: 'location' } },
        { key: 'category',    label: 'Categoría',    source: 'CATEGORIES', optionValue: 'IdCategory', optionLabel: 'Descr' },
        { key: 'subcategory', label: 'Subcategoría', dependsOn: 'category', optionsFrom: 'Children', optionValue: 'IdCategory', optionLabel: 'Descr' },
      ] },
      { type: 'table', source: 'main', title: 'Detalle de existencias', rowFilter: true, placeholder: 'Buscar por nombre…',
        search: {
          source: 'CATALOG', optionValue: 'id', optionLabel: 'varietyName',
          label: 'Cargar insumo', placeholder: 'Buscar insumo…',
          cascade: [
            { key: 'category',    label: 'Categoría',    source: 'CATEGORIES', optionValue: 'IdCategory', optionLabel: 'Descr' },
            { key: 'subcategory', label: 'Subcategoría', dependsOn: 'category', optionsFrom: 'Children', optionValue: 'IdCategory', optionLabel: 'Descr' },
          ],
          prefixFrom: 'AggregatedCode', prefixField: 'sku',
        },
        fields: [
          { label: 'Variedad / Producto', selectorValue: 'varietyName' },
          { label: 'Existencia actual',   selectorType: 'COMPUTED', selectorValue: 'existenciaFmt' },
          { label: 'Cantidad a ajustar',  selectorValue: 'cantidad', renderer: 'signedInputAdd' },
        ],
      },
      { type: 'drawer', trigger: 'Finalizar registro', title: 'Resumen de cambios', children: [
        { type: 'table', source: 'collection', title: 'Ajustes', rowKey: 'id', fields: [
          { label: 'Variedad',    selectorValue: 'varietyName' },
          { label: 'Ajuste',      selectorValue: 'cantidad', renderer: 'signedInput' },
          { label: 'Nuevo total', selectorType: 'COMPUTED', selectorValue: 'nuevoTotalFmt' },
          { label: '',            selectorValue: 'rm', renderer: 'removeButton' },
        ] },
        { type: 'actions', buttons: [ { on: 'CONFIRM', label: 'Confirmar y guardar cambios' } ] },
      ] },
    ],
  },
  JsonREA: {
    resources: [
      { id: 'STOCK', descr: 'Existencias', sourceType: 'API',
        parameters: [
          { key: 'location',  sourceType: 'CONTEXT', keyValue: 'location',  valueType: 'string' },
          { key: 'skuPrefix', sourceType: 'CONTEXT', keyValue: 'skuPrefix', valueType: 'string' },
        ] },
    ],
    events: [], agents: [],
  },
  JsonWorkflow: {
    initialState: 'UNDEFINED',
    states: ['UNDEFINED', 'GUARDADO'],
    transitions: [
      { from: 'UNDEFINED', to: 'UNDEFINED', on: 'EXPORT',  event: 'exportAjustes' },
      { from: 'GUARDADO',  to: 'GUARDADO',  on: 'EXPORT',  event: 'exportAjustes' },
      { from: 'UNDEFINED', to: 'GUARDADO',  on: 'CONFIRM', event: 'confirmAjustes', guard: 'hasItems' },
    ],
  },
}

/* ─────────────────────────── FETCHERS ─────────────────────────── */
const fincasFetcher: Fetcher = async () => ({ success: 'true', message: '', data: FINCAS, traceId: null })

const categoriesFetcher: Fetcher = async () => {
  const res = await getCategories()
  let cats: unknown[] = []
  try { cats = JSON.parse((res.data as StringApiResponse).data ?? '[]') } catch { cats = [] }
  return { success: 'true', message: '', data: cats, traceId: null }
}

// Existencias desde el INVENTARIO compartido (IndexedDB). Siembra la finca la 1ª vez.
const stockFetcher: Fetcher = async (_id, params) => {
  const loc = params.location ?? ''
  if (!loc) return { success: 'true', message: '', data: [], traceId: null }
  await ensureSeeded(loc)
  // cantidad vacía (cuánto agregar) · original = existencia actual (referencia).
  const data = (await getStock(loc, params.skuPrefix ?? '')).map(r => ({ id: r.id, varietyName: r.varietyName, original: r.qty, cantidad: '' }))
  return { success: 'true', message: '', data, traceId: null }
}

// Catálogo para "Cargar insumo" — shape de fila de ajuste (existencia real del inventario).
const catalogFetcher: Fetcher = async () => {
  const loc = (getStoredUser() as { location?: string } | null)?.location ?? ''
  const byId = new Map((loc ? await getStock(loc) : []).map(s => [s.id, s.qty]))
  const res = await getMasterProducts()
  const all = (res.data as MasterProductDTOListApiResponse | undefined)?.data ?? []
  const data = all.flatMap(p => (p.mv ?? []).map(v => {
    const id = `${p.sku ?? ''}-${v.idVariety ?? 0}`
    return { id, varietyName: v.name ?? '', original: byId.get(id) ?? 0, cantidad: '', sku: p.sku ?? '', added: true }
  }))
  return { success: 'true', message: '', data, traceId: null }
}

// CSV de los ajustes (lo agregado).
function exportCsv(rows: Row[]) {
  const added = rows.filter(r => num(r.cantidad) !== 0)
  const header = 'producto,existencia,ajuste,nuevo_total'
  const body = added.map(r => `"${String(r.varietyName ?? '').replace(/"/g, '""')}",${num(r.original)},${num(r.cantidad)},${Math.max(0, num(r.original) + num(r.cantidad))}`).join('\n')
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ajustes-inventario-${Date.now().toString(36)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ─────────────────────────── REGISTRY ─────────────────────────── */
const registry = buildRegistry({
  fetchers: { FINCAS: fincasFetcher, CATEGORIES: categoriesFetcher, STOCK: stockFetcher, CATALOG: catalogFetcher },
  computeds: {
    skuPrefix: ctx => {
      const opts = (ctx.$options ?? {}) as Record<string, { AggregatedCode?: string } | undefined>
      return (opts.subcategory ?? opts.category)?.AggregatedCode ?? ''
    },
    existenciaFmt: row => `${num(row.original)} UN`,                         // referencia (existencia actual)
    nuevoTotalFmt: row => `${Math.max(0, num(row.original) + num(row.cantidad))} UN`,   // existencia ± ajuste (no baja de 0)
  },
  actions: {
    exportAjustes: ({ collection }) => {
      if (collection.length === 0) { toast('No hay cambios para exportar.'); return }
      exportCsv(collection)
      toast.success(`Ajustes exportados (${collection.length} cambio${collection.length === 1 ? '' : 's'})`)
    },
    // Suma lo agregado al stock existente (no reemplaza).
    confirmAjustes: ({ collection, clearCollection, context }) => {
      const loc = String(context.location ?? '')
      void (async () => {
        await receive(loc, collection.map(r => ({ id: String(r.id ?? ''), varietyName: String(r.varietyName ?? ''), qty: num(r.cantidad) })))
        await clearResourcePrefix('STOCK')
      })()
      toast.success(`${collection.length} ajuste${collection.length === 1 ? '' : 's'} sumado${collection.length === 1 ? '' : 's'} al stock`)
      clearCollection()
    },
  },
})

const CONFIG_ID = ADJ_CONFIG.prefix

export default function AjustesInventarioTrxPage() {
  const [config, setConfig] = useState<JsonConfig | null>(null)
  useEffect(() => {
    void (async () => {
      await saveConfig(CONFIG_ID, ADJ_CONFIG, 'operations')
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
