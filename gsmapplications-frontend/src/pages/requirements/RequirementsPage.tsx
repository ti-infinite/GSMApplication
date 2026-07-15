import { useEffect, useState } from 'react'
import { TrxRuntime, buildRegistry } from '@/entities/trx'
import type { JsonConfig, Fetcher } from '@/entities/trx'
import { getConfig, saveConfig, savePedido } from '@/shared/lib/idb'
import { Skeleton } from '@/shared/ui/skeleton'
import { toast } from 'sonner'
import { getCategories, getMasterProducts } from '@/shared/api/operations/endpoints'
import type { StringApiResponse, MasterProductDTOListApiResponse } from '@/shared/api/operations/model'

/* ───────────────────────────────────────────────────────────────────────────
 * 1) EL JSON — Requirements entero desde config (vendría del backend).
 * ─────────────────────────────────────────────────────────────────────────── */
const REQ_CONFIG: JsonConfig = {
  prefix: 'REQUCS',

  JsonFront: {
    title:    'Requirements',
    subtitle: 'Módulo config-driven — filtros en cascada + skuPrefix derivado.',
    rowKey:   'id',
    // context derivado: skuPrefix = AggregatedCode de la subcat/cat elegida
    derive: [{ key: 'skuPrefix', compute: 'skuPrefix' }],
    components: [
      { type: 'filters', filters: [
        { key: 'location',    label: 'Finca',        source: 'FINCAS',     optionValue: 'location',   optionLabel: 'name', cookieDefault: { field: 'location' } },
        { key: 'category',    label: 'Categoría',    source: 'CATEGORIES', optionValue: 'IdCategory', optionLabel: 'Descr' },
        { key: 'subcategory', label: 'Subcategoría', dependsOn: 'category', optionsFrom: 'Children', optionValue: 'IdCategory', optionLabel: 'Descr' },
      ] },
      { type: 'grid', cols: 10, children: [
        { type: 'table', span: 7, source: 'main', title: 'Productos', rowFilter: true, placeholder: 'Buscar variedad…', fields: [
          { label: 'Variedad', selectorValue: 'varietyName' },
          { label: 'Consumo',  selectorValue: 'consumption', renderer: 'withUnit', sub: 'unit' },
          { label: 'Restante', selectorValue: 'remaining',   renderer: 'withUnit', sub: 'unit' },
          { label: 'Cantidad a pedir', selectorValue: 'pedir', renderer: 'input' },
          { label: '', selectorValue: 'add', renderer: 'addButton' },
        ] },
        { type: 'stack', span: 3, children: [
          { type: 'table', source: 'collection', title: 'Pedido', rowKey: 'id', target: 'trxProducts', fields: [
            { label: 'Variedad', selectorValue: 'varietyName' },
            { label: 'Cant.',    selectorValue: 'pedir' },
            { label: '', selectorValue: 'rm', renderer: 'removeButton' },
          ] },
          { type: 'actions', buttons: [
            { on: 'CONFIRM', label: 'Confirmar pedido' },
            { on: 'NEW',     label: 'Nuevo pedido' },
          ] },
        ] },
      ] },
    ],
  },

  JsonREA: {
    resources: [
      { id: 'LOADCS', descr: 'Stock', sourceType: 'API', cacheIn: 'INDEXED_DB',
        parameters: [
          { key: 'location',  sourceType: 'CONTEXT', keyValue: 'location',  valueType: 'string' },
          { key: 'skuPrefix', sourceType: 'CONTEXT', keyValue: 'skuPrefix', valueType: 'string' },
        ] },
    ],
    events: [], agents: [],
  },

  JsonWorkflow: {
    initialState: 'UNDEFINED',
    states: ['UNDEFINED', 'COMPLETED'],
    transitions: [
      { from: 'UNDEFINED', to: 'COMPLETED', on: 'CONFIRM', event: 'confirmPedido', guard: 'hasItems' },
      { from: 'COMPLETED', to: 'UNDEFINED', on: 'NEW',     event: 'resetPedido' },
    ],
  },
}

/* ───────────────────────────────────────────────────────────────────────────
 * 2) EL REGISTRY del módulo — lo específico (genéricos vienen de buildRegistry).
 * ─────────────────────────────────────────────────────────────────────────── */
const FINCAS = [
  { location: 'NRJ', name: 'Finca Naranjal' },
  { location: 'GUA', name: 'Guali' },
  { location: 'AGC', name: 'Agua Clara' },
  { location: 'NCD', name: 'Nacederos' },
]
const seed = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0)
const UNITS = ['kg', 'L', 'UN', 'ml']

const fincasFetcher: Fetcher = async () => ({ success: 'true', message: '', data: FINCAS, traceId: null })

// Categorías REALES (JSON string → parse). Cada categoría trae Children (subcats).
const categoriesFetcher: Fetcher = async () => {
  const res = await getCategories()
  let cats: unknown[] = []
  try { cats = JSON.parse((res.data as StringApiResponse).data ?? '[]') } catch { cats = [] }
  return { success: 'true', message: '', data: cats, traceId: null }
}

// Stock: masterProducts filtrado por skuPrefix; consumo/restante simulados por finca.
const stockFetcher: Fetcher = async (_id, params) => {
  const loc = params.location ?? ''
  if (!loc) return { success: 'true', message: '', data: [], traceId: null }
  const prefix = params.skuPrefix ?? ''
  const res = await getMasterProducts()
  const all = (res.data as MasterProductDTOListApiResponse | undefined)?.data ?? []
  const products = prefix ? all.filter(p => (p.sku ?? '').startsWith(prefix)) : all
  const data = products.flatMap(p => {
    const sku = p.sku ?? ''
    return (p.mv ?? []).map(v => {
      const idV  = v.idVariety ?? 0
      const base = seed(`${sku}-${idV}|${loc}`)
      return {
        id:          `${sku}-${idV}`,
        varietyName: v.name ?? '',
        unit:        UNITS[base % UNITS.length],
        consumption: Number(((base % 60) / 10).toFixed(1)),
        remaining:   Number((((base * 3) % 800) / 10).toFixed(1)),
      }
    })
  })
  return { success: 'true', message: '', data, traceId: null }
}

const registry = buildRegistry({
  fetchers: { FINCAS: fincasFetcher, CATEGORIES: categoriesFetcher, LOADCS: stockFetcher },
  computeds: {
    // skuPrefix = AggregatedCode de la subcategoría (o categoría) ELEGIDA.
    skuPrefix: ctx => {
      const opts = (ctx.$options ?? {}) as Record<string, { AggregatedCode?: string } | undefined>
      const opt = opts.subcategory ?? opts.category
      return opt?.AggregatedCode ?? ''
    },
  },
  actions: {
    confirmPedido: ({ collection, context }) => {
      const seqN = (parseInt(localStorage.getItem('req_order_seq') ?? '0', 10) || 0) + 1
      const consecutivo = `PED-${String(seqN).padStart(4, '0')}`
      const lines = collection.map(r => ({ id: r.id, varietyName: r.varietyName, qty: Number(r.pedir) }))
      void savePedido(consecutivo, { consecutivo, location: context.location, lines, createdAt: Date.now() })
      localStorage.setItem('req_order_seq', String(seqN))
      toast.success(`Pedido ${consecutivo} confirmado (${lines.length} producto${lines.length === 1 ? '' : 's'})`)
    },
    resetPedido: ({ clearCollection }) => { clearCollection(); toast.success('Listo para un nuevo pedido') },
  },
})

const CONFIG_ID = REQ_CONFIG.prefix

export default function RequirementsTrxPage() {
  const [config, setConfig] = useState<JsonConfig | null>(null)
  useEffect(() => {
    void (async () => {
      await saveConfig(CONFIG_ID, REQ_CONFIG, 'operations')   // simula el response del backend
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
