import { useEffect, useState } from 'react'
import { TrxRuntime, buildRegistry } from '@/entities/trx'
import type { JsonConfig, Fetcher, RuntimeCtx } from '@/entities/trx'
import { getConfig, saveConfig, getPedido, listPedidos, saveOrden } from '@/shared/lib/idb'
import { Skeleton } from '@/shared/ui/skeleton'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog'
import { toast } from 'sonner'
import { Eye, Send, Printer, Package, Sprout, FlaskConical, Wheat } from 'lucide-react'
import { getMasterProducts, getCategories } from '@/shared/api/operations/endpoints'
import type { MasterProductDTOListApiResponse, StringApiResponse } from '@/shared/api/operations/model'

type Row = Record<string, unknown>
type Proveedor = { id: string; name: string; short: string }
const seed = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0)
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Precio unitario MOCK, sembrado por (proveedor, insumo) → estable. Luego será endpoint.
const priceOf = (proveedorId: string, insumoId: string) =>
  proveedorId ? (seed(`${proveedorId}|${insumoId}`) % 1400) + 40 : 0

const PROVEEDORES: Proveedor[] = [
  { id: 'AGN', name: 'Agroinovar S.A.',   short: 'Agroinovar' },
  { id: 'FTM', name: 'FertiMundo Ltda.',  short: 'FertiMundo' },
  { id: 'VCP', name: 'Verde Campo S.A.S.', short: 'VerdeCampo' },
]
const CENTROS = [
  { id: 'NRJ', name: 'Finca Naranjal' },
  { id: 'GUA', name: 'Guali' },
  { id: 'AGC', name: 'Agua Clara' },
  { id: 'NCD', name: 'Nacederos' },
]
const UNITS = ['kg', 'L', 'ml', 'bultos']
const ICONS = [Package, Sprout, FlaskConical, Wheat]
const iconFor = (id: string) => ICONS[seed(id) % ICONS.length]

// Da forma a una fila de la orden (mock: ref/presentación, unidad, consumo/sobrante).
function shapeLine(id: string, varietyName: string, qty: number): Row {
  const base = seed(id)
  const unit = UNITS[base % UNITS.length]
  return {
    id, varietyName, qty, unit,
    consumption: (base % 1200) + 200,
    remaining:   (base % 160) + 5,
    chosenProveedor: '',   // proveedor elegido para esta línea (botón + de la comparativa)
  }
}

/* ─────────────────────────── CONFIG (JSON) ─────────────────────────── */
const OC_CONFIG: JsonConfig = {
  prefix: 'OCCS',
  JsonFront: {
    title:    'Orden de Compra',
    subtitle: 'Revisa el requerimiento, elige proveedores para comparar y previsualiza la orden.',
    rowKey:   'id',
    initCollection: 'main',   // las líneas del pedido → collection editable
    components: [
      { type: 'filters', filters: [
        { key: 'centro',      label: 'Centro de costo',  source: 'CENTROS', optionValue: 'id',          optionLabel: 'name', cookieDefault: { field: 'location' } },
        { key: 'consecutivo', label: 'N° Requerimiento', source: 'PEDIDOS', optionValue: 'consecutivo', optionLabel: 'consecutivo' },
      ] },
      { type: 'stack', children: [
        { type: 'heading', title: 'Revisión de Pedidos' },
        { type: 'table', source: 'collection', rowKey: 'id',
          search: {
          source: 'CATALOG', optionValue: 'id', optionLabel: 'varietyName',
          label: 'Cargar insumo', placeholder: 'Buscar insumo…',
          cascade: [
            { key: 'category',    label: 'Categoría',    source: 'CATEGORIES', optionValue: 'IdCategory', optionLabel: 'Descr' },
            { key: 'subcategory', label: 'Subcategoría', dependsOn: 'category', optionsFrom: 'Children', optionValue: 'IdCategory', optionLabel: 'Descr' },
          ],
          prefixFrom: 'AggregatedCode', prefixField: 'sku',
        },
          select: { key: 'proveedores', label: 'Proveedores', source: 'PROVEEDORES', optionValue: 'id', optionLabel: 'name' },
          dynamicFields: { from: 'proveedores', label: 'Precio {short}', selector: 'precio', pick: 'chosenProveedor' },
          fields: [
            { label: 'Insumo',          selectorValue: 'varietyName' },
            { label: 'Consumo',         selectorValue: 'consumption', renderer: 'withUnit', sub: 'unit' },
            { label: 'Sobrante',        selectorValue: 'remaining',   renderer: 'withUnit', sub: 'unit' },
            { label: 'Pedido', selectorValue: 'qty', renderer: 'input' },
          ],
        },
      ] },
      { type: 'preview' },   // "Visualizar Documento" → un botón por proveedor → factura
    ],
  },
  JsonREA: {
    resources: [
      { id: 'PEDIDO_LINES', descr: 'Líneas del pedido', sourceType: 'API', cacheIn: 'INDEXED_DB',
        parameters: [ { key: 'consecutivo', sourceType: 'CONTEXT', keyValue: 'consecutivo', valueType: 'string' } ] },
    ],
    events: [], agents: [],
  },
  JsonWorkflow: { initialState: 'UNDEFINED', states: ['UNDEFINED', 'GENERATED'], transitions: [] },
}

/* ─────────────────────────── FETCHERS ─────────────────────────── */
const centrosFetcher: Fetcher     = async () => ({ success: 'true', message: '', data: CENTROS, traceId: null })
const proveedoresFetcher: Fetcher = async () => ({ success: 'true', message: '', data: PROVEEDORES, traceId: null })

// Categorías REALES (JSON string → parse). Cada categoría trae Children (subcats).
const categoriesFetcher: Fetcher = async () => {
  const res = await getCategories()
  let cats: unknown[] = []
  try { cats = JSON.parse((res.data as StringApiResponse).data ?? '[]') } catch { cats = [] }
  return { success: 'true', message: '', data: cats, traceId: null }
}

const pedidosFetcher: Fetcher = async () => {
  const list = await listPedidos<{ consecutivo: string }>()
  return { success: 'true', message: '', data: list, traceId: null }
}

// Líneas del pedido elegido. El proveedor se elige en el toolbar (comparativa).
const pedidoLinesFetcher: Fetcher = async (_id, params) => {
  const cons = params.consecutivo ?? ''
  if (!cons) return { success: 'true', message: '', data: [], traceId: null }
  const pedido = await getPedido<{ lines?: Array<{ id: string; varietyName: string; qty: number }> }>(cons)
  const data = (pedido?.lines ?? []).map(l => shapeLine(l.id, l.varietyName, l.qty))
  return { success: 'true', message: '', data, traceId: null }
}

// Catálogo para "cargar insumo" — shape de fila de la collection.
const catalogFetcher: Fetcher = async () => {
  const res = await getMasterProducts()
  const all = (res.data as MasterProductDTOListApiResponse | undefined)?.data ?? []
  const data = all.flatMap(p => (p.mv ?? []).map(v => ({ ...shapeLine(`${p.sku ?? ''}-${v.idVariety ?? 0}`, v.name ?? '', 1), sku: p.sku ?? '' })))
  return { success: 'true', message: '', data, traceId: null }
}

/* ─────────────────── COMPONENTE DEDICADO: preview (factura) ─────────────────── */
// Un botón por proveedor SELECCIONADO; cada uno abre SU factura (mismo insumos,
// precios del proveedor). "Enviar orden de compra" confirma esa factura.
function PreviewBar({ ctx }: { ctx: RuntimeCtx }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const lines = ctx.collection.items as Row[]
  const provs = (ctx.selections['proveedores'] ?? []) as Proveedor[]
  const active = provs.find(p => p.id === openId) ?? null
  const fechaEstimada = new Date(Date.now() + 10 * 86_400_000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  const finca = CENTROS.find(c => c.id === String(ctx.context.centro ?? ''))?.name ?? (String(ctx.context.centro ?? '') || '—')
  const consecutivo = String(ctx.context.consecutivo ?? '') || '—'

  const chosenFor = (prov: Proveedor) => lines.filter(l => String(l.chosenProveedor ?? '') === prov.id)
  const totalFor = (prov: Proveedor) =>
    chosenFor(prov).reduce((s, l) => s + Number(l.qty || 0) * priceOf(prov.id, String(l.id ?? '')), 0)

  const enviarOrden = (prov: Proveedor) => {
    const seqN = (parseInt(localStorage.getItem('po_orden_seq') ?? '0', 10) || 0) + 1
    const numero = `OC-${String(seqN).padStart(4, '0')}`
    const invLines = chosenFor(prov).map(l => ({ id: String(l.id ?? ''), varietyName: String(l.varietyName ?? ''), qty: Number(l.qty || 0), precioUnit: priceOf(prov.id, String(l.id ?? '')) }))
    void saveOrden(numero, { numero, estado: 'GENERADA', proveedor: prov.name, origen: String(ctx.context.consecutivo ?? ''), lines: invLines, createdAt: Date.now() })
    localStorage.setItem('po_orden_seq', String(seqN))
    toast.success(`Orden ${numero} — ${prov.name} enviada`)
    setOpenId(null)
  }

  // Descarga la factura como PDF vía print-to-PDF del navegador (sin librerías).
  const descargarPdf = (prov: Proveedor) => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const filas = chosenFor(prov).map(l => {
      const pu = priceOf(prov.id, String(l.id ?? '')), qty = Number(l.qty || 0)
      return `<tr><td>${esc(String(l.varietyName ?? ''))}</td><td class="r">${qty} ${esc(String(l.unit ?? ''))}</td><td class="r">${money(pu)}</td><td class="r">${money(qty * pu)}</td></tr>`
    }).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Orden de Compra — ${esc(prov.name)}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;padding:32px}
        h1{font-size:20px;margin:0 0 2px} .sub{color:#666;font-size:13px;margin-bottom:20px}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;background:#f4f6f4;padding:14px 16px;border-radius:8px;margin-bottom:20px}
        .lbl{text-transform:uppercase;font-size:10px;color:#888;letter-spacing:.5px} .val{font-weight:600;font-size:13px}
        table{width:100%;border-collapse:collapse;font-size:13px} th,td{padding:8px 10px;border-bottom:1px solid #e5e7e5}
        th{text-align:left;background:#f4f6f4;font-size:11px;text-transform:uppercase;color:#666} .r{text-align:right}
        .total{text-align:right;font-size:16px;font-weight:700;margin-top:16px}
      </style></head><body>
      <h1>Orden de Compra</h1><div class="sub">${esc(prov.name)}</div>
      <div class="meta">
        <div><div class="lbl">Proveedor</div><div class="val">${esc(prov.name)}</div></div>
        <div><div class="lbl">Fecha</div><div class="val">${fechaEstimada}</div></div>
        <div><div class="lbl">Finca</div><div class="val">${esc(finca)}</div></div>
        <div><div class="lbl">N° Requerimiento</div><div class="val">${esc(consecutivo)}</div></div>
      </div>
      <table><thead><tr><th>Producto</th><th class="r">Cantidad</th><th class="r">Unitario</th><th class="r">Subtotal</th></tr></thead><tbody>${filas}</tbody></table>
      <div class="total">Total del pedido: ${money(totalFor(prov))}</div>
      <script>window.onload=function(){window.print()}<\/script>
    </body></html>`
    const w = window.open('', '_blank')
    if (!w) { toast.error('Permití las ventanas emergentes para descargar el PDF'); return }
    w.document.write(html)
    w.document.close()
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Visualizar Documento:</span>
        {provs.length === 0 && <span className="text-sm text-muted-foreground">Elegí proveedores y asigná productos con el botón + para previsualizar.</span>}
        {provs.map(p => {
          const n = chosenFor(p).length
          return (
            <Button key={p.id} variant="outline" size="sm" className="gap-2" disabled={n === 0} onClick={() => setOpenId(p.id)}>
              <Eye className="h-4 w-4" /> Preview {p.short} ({n})
            </Button>
          )
        })}
      </div>

      <Dialog open={!!active} onOpenChange={o => !o && setOpenId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Previsualización de Orden de Compra</DialogTitle>
            <DialogDescription>Revisión final antes de enviar al proveedor</DialogDescription>
          </DialogHeader>

          {active && (
            <div className="grid gap-5 p-6 md:grid-cols-3">
              {/* ── Factura ── */}
              <div className="overflow-hidden rounded-xl border border-border md:col-span-2">
                <div className="grid grid-cols-2 gap-3 bg-primary/5 px-4 py-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Proveedor</p>
                    <p className="text-sm font-semibold text-foreground">{active.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha</p>
                    <p className="text-sm font-semibold text-foreground">{fechaEstimada}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Finca</p>
                    <p className="text-sm font-semibold text-foreground">{finca}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">N° Requerimiento</p>
                    <p className="text-sm font-semibold text-foreground">{consecutivo}</p>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-border bg-muted/40 text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Producto</th>
                      <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                      <th className="px-4 py-2 text-right font-medium">Unitario</th>
                      <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {chosenFor(active).map((l, i) => {
                      const Icon = iconFor(String(l.id ?? ''))
                      const pu = priceOf(active.id, String(l.id ?? ''))
                      const qty = Number(l.qty || 0)
                      return (
                        <tr key={i}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="font-medium text-foreground">{String(l.varietyName ?? '')}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-foreground">{qty} {String(l.unit ?? '')}</td>
                          <td className="px-4 py-3 text-right text-foreground">{money(pu)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">{money(qty * pu)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <span className="text-sm font-bold text-foreground">Total del pedido</span>
                  <span className="text-lg font-bold text-primary">{money(totalFor(active))}</span>
                </div>
              </div>

              {/* ── Acciones ── */}
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Acciones de Orden</p>
                <div className="flex flex-col gap-2">
                  <Button className="w-full gap-2" onClick={() => enviarOrden(active)}>
                    <Send className="h-4 w-4" /> Confirmar / Enviar 
                  </Button>
                  <Button variant="ghost" className="w-full gap-2" onClick={() => descargarPdf(active)}>
                    <Printer className="h-4 w-4" /> Descargar PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─────────────────────────── REGISTRY ─────────────────────────── */
const registry = buildRegistry({
  fetchers: {
    CENTROS: centrosFetcher, PEDIDOS: pedidosFetcher, PEDIDO_LINES: pedidoLinesFetcher,
    CATALOG: catalogFetcher, PROVEEDORES: proveedoresFetcher, CATEGORIES: categoriesFetcher,
  },
  // Precio por columna dinámica: se llama con { ...row, $opt: proveedor }.
  computeds: {
    precio: row => {
      const opt = row.$opt as Proveedor | undefined
      const p = priceOf(String(opt?.id ?? ''), String(row.id ?? ''))
      return p ? money(p) : '—'
    },
  },
  components: {
    preview: (_node, ctx) => <PreviewBar ctx={ctx} />,
  },
})

const CONFIG_ID = OC_CONFIG.prefix

export default function PurchaseOrderTrxPage() {
  const [config, setConfig] = useState<JsonConfig | null>(null)
  useEffect(() => {
    void (async () => {
      await saveConfig(CONFIG_ID, OC_CONFIG, 'operations')
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
