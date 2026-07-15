import { useEffect, useState } from 'react'
import { TrxRuntime, buildRegistry } from '@/entities/trx'
import type { JsonConfig, Fetcher } from '@/entities/trx'
import { getConfig, saveConfig } from '@/shared/lib/idb'
import { getPendingLines, saveReceptionTrx, recepcionValida, guardarBorrador, getOpenOrdenes } from '@/entities/order/receptions'
import { Skeleton } from '@/shared/ui/skeleton'
import { toast } from 'sonner'

type Row = Record<string, unknown>

const FINCAS = [
  { location: 'NRJ', name: 'Finca Naranjal' },
  { location: 'GUA', name: 'Guali' },
  { location: 'AGC', name: 'Agua Clara' },
  { location: 'NCD', name: 'Nacederos' },
]

/* ─────────────────────────── CONFIG (JSON) ─────────────────────────── */
const VER_CONFIG: JsonConfig = {
  prefix: 'RECFINCS',   // recepción en finca (verificación)
  JsonFront: {
    title:       'Confirmación de Requerimientos',
    subtitle:    'Verifica los insumos recibidos contra el requerimiento realizado.',
    rowKey:      'id',
    initCollection: 'main',    // líneas de la orden → collection editable
    components: [
      { type: 'filters', filters: [
        { key: 'finca',   label: 'Finca',             source: 'FINCAS',  optionValue: 'location', optionLabel: 'name', cookieDefault: { field: 'location' } },
        { key: 'factura', label: 'Número de factura', source: 'ORDENES', optionValue: 'numero',   optionLabel: 'numero' },
      ] },
      { type: 'stack', children: [
        { type: 'heading', title: 'Insumos del Requerimiento', badge: 'pendientes' },
        { type: 'table', source: 'collection', rowKey: 'id', expand: 'rejectComment',
          fields: [
            { label: 'Variedad / Producto', selectorValue: 'varietyName' },
            { label: 'Cant. Pedida',       selectorValue: 'enviada' },
            { label: 'Cant. Recibida',      selectorValue: 'recibida', renderer: 'input' },
            { label: 'Estado / Acciones',   selectorValue: 'estado', renderer: 'verifyReject' },
          ],
        },
      ] },
      { type: 'note', text: 'Al confirmar la recepción se actualizara el inventario local de la finca y se notificara al centro de logística.' },
      { type: 'actions', align: 'end', buttons: [
        { on: 'CONFIRM', label: 'Confirmar recepción' },
      ] },
    ],
  },
  JsonREA: {
    resources: [
      { id: 'ORDEN_LINES', descr: 'Líneas de la orden', sourceType: 'API', cacheIn: 'INDEXED_DB',
        parameters: [ { key: 'factura', sourceType: 'CONTEXT', keyValue: 'factura', valueType: 'string' } ] },
    ],
    events: [], agents: [],
  },
  JsonWorkflow: {
    initialState: 'PENDIENTE',
    states: ['PENDIENTE', 'BORRADOR', 'CONFIRMADA'],
    transitions: [
      { from: 'PENDIENTE', to: 'BORRADOR',   on: 'SAVE',    event: 'guardarBorrador' },
      { from: 'BORRADOR',  to: 'BORRADOR',   on: 'SAVE',    event: 'guardarBorrador' },
      { from: 'PENDIENTE', to: 'CONFIRMADA', on: 'CONFIRM', event: 'confirmRecepcion', guard: 'recepcionValida' },
      { from: 'BORRADOR',  to: 'CONFIRMADA', on: 'CONFIRM', event: 'confirmRecepcion', guard: 'recepcionValida' },
    ],
  },
}

/* ─────────────────────────── FETCHERS ─────────────────────────── */
const fincasFetcher: Fetcher = async () => ({ success: 'true', message: '', data: FINCAS, traceId: null })

// Órdenes ABIERTAS (no RECIBIDA) para el combo de N° de factura.
const ordenesFetcher: Fetcher = async () => {
  const list = await getOpenOrdenes()
  return { success: 'true', message: '', data: list, traceId: null }
}

// Líneas PENDIENTES por recibir de la factura (orden − ya recibido en recepciones previas).
const ordenLinesFetcher: Fetcher = async (_id, params) => {
  const data = await getPendingLines(params.factura ?? '')
  return { success: 'true', message: '', data, traceId: null }
}

/* ─────────────────────────── REGISTRY ─────────────────────────── */
const registry = buildRegistry({
  fetchers: { ORDEN_LINES: ordenLinesFetcher, FINCAS: fincasFetcher, ORDENES: ordenesFetcher },
  computeds: {
    // Contador de pendientes (badge del heading). Recibe { $items } de la collection.
    pendientes: row => {
      const items = (row.$items as Row[]) ?? []
      const n = items.filter(i => String(i.estado ?? 'pendiente') === 'pendiente').length
      return n === 0 ? 'Todo verificado' : `${n} item${n === 1 ? '' : 's'} pendiente${n === 1 ? '' : 's'}`
    },
  },
  guards: {
    // Confirmar: ≥1 ítem resuelto y todo rechazo con comentario. Pendientes se permiten.
    recepcionValida: ({ collection }) => recepcionValida(collection),
  },
  actions: {
    guardarBorrador: ({ collection, context }) => {
      guardarBorrador(String(context.factura ?? ''), collection)
      toast('Borrador guardado — podés retomar la recepción luego.')
    },
    confirmRecepcion: ({ collection, context }) => {
      void saveReceptionTrx(String(context.factura ?? ''), collection).then(({ recibidos, rechazados, ordenCerrada, consecutivo }) => {
        toast.success(`Recepción ${consecutivo} confirmada — ${recibidos} a inventario${rechazados ? `, ${rechazados} rechazado(s)` : ''}. ${ordenCerrada ? 'Orden RECIBIDA (completa).' : 'Pendientes abiertos.'}`)
      })
    },
  },
})

const CONFIG_ID = VER_CONFIG.prefix

export default function VerificationTrxPage() {
  const [config, setConfig] = useState<JsonConfig | null>(null)
  useEffect(() => {
    void (async () => {
      await saveConfig(CONFIG_ID, VER_CONFIG, 'operations')
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
