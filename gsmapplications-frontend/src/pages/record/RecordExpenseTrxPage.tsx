import { useEffect, useState } from 'react'
import { TrxRuntime, buildRegistry } from '@/entities/trx'
import type { JsonConfig, Fetcher } from '@/entities/trx'
import { getConfig, saveConfig, clearResourcePrefix } from '@/shared/lib/idb'
import { ensureSeeded, getStock, consume } from '@/entities/inventory/inventory'
import { Skeleton } from '@/shared/ui/skeleton'
import { toast } from 'sonner'
import { getCategories } from '@/shared/api/operations/endpoints'
import type { StringApiResponse } from '@/shared/api/operations/model'

const FINCAS = [
  { location: 'NRJ', name: 'Finca Naranjal' },
  { location: 'GUA', name: 'Guali' },
  { location: 'AGC', name: 'Agua Clara' },
  { location: 'NCD', name: 'Nacederos' },
]

/* ─────────────────────────── CONFIG (JSON) ─────────────────────────── */
const GASTO_CONFIG: JsonConfig = {
  prefix: 'GASCS',
  JsonFront: {
    title:    'Registro de Gasto',
    subtitle: 'Gestión de consumos directos de insumos.',
    rowKey:   'id',
    derive:   [{ key: 'skuPrefix', compute: 'skuPrefix' }],
    components: [
      { type: 'filters', filters: [
        { key: 'location',    label: 'Ubicación',    source: 'FINCAS',     optionValue: 'location',   optionLabel: 'name', cookieDefault: { field: 'location' } },
        { key: 'category',    label: 'Categoría',    source: 'CATEGORIES', optionValue: 'IdCategory', optionLabel: 'Descr' },
        { key: 'subcategory', label: 'Subcategoría', dependsOn: 'category', optionsFrom: 'Children', optionValue: 'IdCategory', optionLabel: 'Descr' },
      ] },
      { type: 'table', source: 'main', title: 'Stock productos', rowFilter: true, placeholder: 'Buscar variedad…',
        fields: [
          { label: 'Variedad',       selectorValue: 'varietyName' },
          { label: 'Cantidad',       selectorValue: 'cantidad', renderer: 'inputAdd' },
          { label: 'Saldo restante', selectorValue: 'saldo' },
        ],
      },
      { type: 'drawer', trigger: 'Finalizar registro', title: 'Resumen del gasto', children: [
        { type: 'table', source: 'collection', title: 'Insumos del gasto', rowKey: 'id', fields: [
          { label: 'Variedad', selectorValue: 'varietyName' },
          { label: 'Cantidad', selectorValue: 'cantidad', renderer: 'input' },
          { label: '',         selectorValue: 'rm', renderer: 'removeButton' },
        ] },
        { type: 'actions', buttons: [ { on: 'CONFIRM', label: 'Confirmar gasto' } ] },
      ] },
    ],
  },
  JsonREA: {
    resources: [
      { id: 'STOCK', descr: 'Stock', sourceType: 'API',
        parameters: [
          { key: 'location',  sourceType: 'CONTEXT', keyValue: 'location',  valueType: 'string' },
          { key: 'skuPrefix', sourceType: 'CONTEXT', keyValue: 'skuPrefix', valueType: 'string' },
        ] },
    ],
    events: [], agents: [],
  },
  JsonWorkflow: {
    initialState: 'UNDEFINED',
    states: ['UNDEFINED', 'REGISTRADO'],
    transitions: [ { from: 'UNDEFINED', to: 'REGISTRADO', on: 'CONFIRM', event: 'confirmGasto', guard: 'hasItems' } ],
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

// Stock desde el INVENTARIO compartido (IndexedDB). Siembra la finca la 1ª vez; luego solo lee.
const stockFetcher: Fetcher = async (_id, params) => {
  const loc = params.location ?? ''
  if (!loc) return { success: 'true', message: '', data: [], traceId: null }
  await ensureSeeded(loc)
  const data = (await getStock(loc, params.skuPrefix ?? '')).map(r => ({ id: r.id, varietyName: r.varietyName, cantidad: '', saldo: `${r.qty} und` }))
  return { success: 'true', message: '', data, traceId: null }
}

/* ─────────────────────────── REGISTRY ─────────────────────────── */
const registry = buildRegistry({
  fetchers: { FINCAS: fincasFetcher, CATEGORIES: categoriesFetcher, STOCK: stockFetcher },
  computeds: {
    // skuPrefix = AggregatedCode de la subcategoría (o categoría) ELEGIDA.
    skuPrefix: ctx => {
      const opts = (ctx.$options ?? {}) as Record<string, { AggregatedCode?: string } | undefined>
      return (opts.subcategory ?? opts.category)?.AggregatedCode ?? ''
    },
  },
  actions: {
    confirmGasto: ({ collection, clearCollection, context }) => {
      const items = collection.filter(r => Number(r.cantidad || 0) > 0)
      const loc = String(context.location ?? '')
      void (async () => {
        await consume(loc, items.map(r => ({ id: String(r.id ?? ''), qty: Number(r.cantidad || 0) })))
        await clearResourcePrefix('STOCK')
      })()
      const consecutivo = `GAS-${Date.now().toString(36).toUpperCase()}`
      toast.success(`Gasto ${consecutivo} confirmado — ${items.length} insumo${items.length === 1 ? '' : 's'} descontado${items.length === 1 ? '' : 's'} del stock`)
      clearCollection()
    },
  },
})

const CONFIG_ID = GASTO_CONFIG.prefix

export default function RecordExpenseTrxPage() {
  const [config, setConfig] = useState<JsonConfig | null>(null)
  useEffect(() => {
    void (async () => {
      await saveConfig(CONFIG_ID, GASTO_CONFIG, 'operations')
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
