import { useEffect, useState } from 'react'
import { TrxRuntime, buildRegistry } from '@/entities/trx'
import type { JsonConfig, Fetcher } from '@/entities/trx'
import { getConfig, saveConfig } from '@/shared/lib/idb'
import { Skeleton } from '@/shared/ui/skeleton'
import { toast } from 'sonner'
import { getMasterProducts } from '@/shared/api/operations/endpoints'
import type { MasterProductDTOListApiResponse } from '@/shared/api/operations/model'

/* ─────────────────────────────────────────────────────────────────────────
 * 1) EL JSON — esto es lo único que define el módulo. Vendría del backend.
 *    Cambiá items/filters/trxAttributes y el motor se re-dibuja solo.
 * ──────────────────────────────────────────────────────────────────────── */
const DEMO_CONFIG: JsonConfig = {
  prefix: 'DEMO',        // Prefix — marca de la transacción (→ trxPrefix del payload).

  // ── JsonFront: lista PLANA de components; el layout vive dentro de cada uno ──
  JsonFront: {
    title:    'Runtime declarativo (POC)',
    subtitle: 'Módulo 100% desde JsonConfig — components plano (filters + picker) + workflow FSM.',
    rowKey:   'id',
    components: [
      // filters self-contained: le paso QUÉ filtros; el componente dibuja los combos.
      { type: 'filters', filters: [
        { key: 'location', label: 'Finca', source: 'FINCAS', optionValue: 'location', optionLabel: 'name', cookieDefault: { field: 'location' } },
      ] },
      // grid CSS: span controla el ratio (7/3 = 70/30). Tablas = type:table.
      { type: 'grid', cols: 10, children: [
        { type: 'table', span: 7, source: 'main', title: 'Stock', fields: [
          { label: 'Variedad', source: 'DEMOCS', sourceType: 'INDEXED_DB', selectorValue: 'varietyName' },
          { label: 'Consumo',  source: 'DEMOCS', sourceType: 'INDEXED_DB', selectorValue: 'consumption' },
          { label: 'Restante', source: 'DEMOCS', sourceType: 'INDEXED_DB', selectorValue: 'remaining' },
          { label: 'Nivel', selectorType: 'COMPUTED', selectorValue: 'nivelStock', renderer: 'badge' },
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

  // ── JsonREA: de dónde sale la data ──
  JsonREA: {
    resources: [
      {
        // {id} = el proceso → /api/v1/Resources/DEMOCS. Acá gana el fetcher custom
        // "DEMOCS" (masterProducts necesita transform); el genérico usaría el template.
        id: 'DEMOCS', descr: 'Stock', sourceType: 'API', endpoint: '/api/v1/Resources/{id}', cacheIn: 'INDEXED_DB',
        parameters: [
          { key: 'location', sourceType: 'CONTEXT', keyValue: 'location', valueType: 'string' },
        ],
      },
    ],
    events: [],
    agents: [],
  },

  // ── JsonWorkflow: la FSM. Los botones salen de las transiciones del estado actual ──
  JsonWorkflow: {
    initialState: 'UNDEFINED',
    states: ['UNDEFINED', 'COMPLETED'],
    transitions: [
      { from: 'UNDEFINED', to: 'COMPLETED', on: 'CONFIRM', event: 'confirmPedido', guard: 'hasItems' },
      { from: 'COMPLETED', to: 'UNDEFINED', on: 'NEW',     event: 'resetPedido' },
    ],
  },
}

/* ─────────────────────────────────────────────────────────────────────────
 * 2) EL REGISTRY — lo que el JSON NO puede expresar (data, lógica, widgets),
 *    referenciado por id. Reutilizable entre módulos.
 * ──────────────────────────────────────────────────────────────────────── */
// Fincas mock — mientras se consume el endpoint real (GET /api/fincas).
const FINCAS = [
  { location: 'NRJ', name: 'Finca Naranjal' },
  { location: 'GUA', name: 'Guali' },
  { location: 'AGC', name: 'Agua Clara' },
  { location: 'NCD', name: 'Nacederos' },
]
const seed = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0)

const fincasFetcher: Fetcher = async () => ({ success: 'true', message: '', data: FINCAS, traceId: null })

// Fetcher REAL: pega a masterProducts y transforma productos → variedades.
// (consumo/restante siguen simulados, sembrados por finca → data estable).
const stockFetcher: Fetcher = async (_id, params) => {
  const loc = params.location ?? ''
  if (!loc) return { success: 'true', message: '', data: [], traceId: null }
  const res = await getMasterProducts()
  const all = (res.data as MasterProductDTOListApiResponse | undefined)?.data ?? []
  const data = all.flatMap(p => {
    const sku = p.sku ?? ''
    return (p.mv ?? []).map(v => {
      const idVariety = v.idVariety ?? 0
      const base = seed(`${sku}-${idVariety}|${loc}`)
      return {
        id:          `${sku}-${idVariety}`,
        varietyName: v.name ?? '',
        consumption: Number(((base % 60) / 10).toFixed(1)),
        remaining:   Number((((base * 3) % 800) / 10).toFixed(1)),
      }
    })
  })
  return { success: 'true', message: '', data, traceId: null }
}

// El módulo solo declara LO SUYO; badge/input/addButton/removeButton/hasItems
// vienen del kit base (buildRegistry).
const registry = buildRegistry({
  fetchers: { FINCAS: fincasFetcher, DEMOCS: stockFetcher },
  computeds: {
    nivelStock: row => {
      const r = Number(row.remaining), c = Number(row.consumption)
      if (r <= 0)     return 'Agotado'
      if (r < c * 2)  return 'Bajo'
      return 'OK'
    },
  },
  actions: {
    // Evento CONFIRM: arma el payload (trxProducts) desde el carrito.
    confirmPedido: ({ collection, context }) => {
      const trxProducts = collection.map(r => ({ varietyName: r.varietyName, qty: Number(r.pedir) }))
      console.info('[TRX runtime] CONFIRM → payload:', { location: context.location, trxProducts })
      toast.success(`Pedido confirmado — ${trxProducts.length} ítem(s) (finca ${context.location || '—'})`)
    },
    // Evento NEW: limpia el carrito para el próximo pedido.
    resetPedido: ({ clearCollection }) => {
      clearCollection()
      toast.success('Listo para un nuevo pedido')
    },
  },
})

// La key del config en IndexedDB = el prefix (identificador con sentido del TRX).
const CONFIG_ID = DEMO_CONFIG.prefix

export default function TrxDemoPage() {
  const [config, setConfig] = useState<JsonConfig | null>(null)

  // Simula el flujo real: request al backend → cachea el JSON en IndexedDB
  // (config_cache) → lo lee de ahí. La próxima visita ya sale del cache.
  useEffect(() => {
    void (async () => {
      // POC: siempre re-siembra (simula el "response del backend") para que los
      // cambios del JSON se vean sin limpiar site data. En real sería cache-first
      // + invalidar por versión del config.
      await saveConfig(CONFIG_ID, DEMO_CONFIG, 'operations')   // taggeado por módulo
      const cached = await getConfig<JsonConfig>(CONFIG_ID)
      setConfig(cached)
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
