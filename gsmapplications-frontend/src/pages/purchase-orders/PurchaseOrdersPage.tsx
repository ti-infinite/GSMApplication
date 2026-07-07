import { useEffect, useState } from 'react'
import { Combobox } from '@/shared/ui/combobox'
import { Button } from '@/shared/ui/button'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { SlidersHorizontal, CheckCircle2, Trash2, Send, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { listPedidos, getPedido, saveOrden } from '@/shared/lib/idb'
import { getMasterProducts } from '@/shared/api/operations/operations/operations'
import type { MasterProductDTOListApiResponse } from '@/shared/api/operations/model'
import type { Pedido, PedidoLine, Orden } from '@/entities/order'

// Proveedores mock (aún no hay endpoint). En real vendrían de la API.
const PROVEEDORES = ['BioGrow S.A.', 'AgroInsumos Ltda.', 'Verde Campo S.A.S.']

export default function PurchaseOrdersPage() {
  const [pedidos,   setPedidos]   = useState<Pedido[]>([])
  const [proveedor, setProveedor] = useState('')
  const [consecSel, setConsecSel] = useState('')
  const [items,     setItems]     = useState<PedidoLine[]>([])
  const [applied,   setApplied]   = useState<Pedido | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  // Lista de pedidos confirmados (para el combo de consecutivo).
  useEffect(() => { listPedidos<Pedido>().then(setPedidos) }, [])

  // Catálogo de insumos (masterProducts) para "Cargar Insumo" — funcionalidad admin.
  const [catalog, setCatalog] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    getMasterProducts()
      .then(res => {
        const products = (res.data as MasterProductDTOListApiResponse).data ?? []
        setCatalog(products.flatMap(p =>
          (p.mv ?? []).map(v => ({ id: `${p.sku ?? ''}-${v.idVariety ?? 0}`, name: v.name ?? '' })),
        ))
      })
      .catch(() => {})
  }, [])

  const selectedPedido = pedidos.find(p => p.consecutivo === consecSel) ?? null

  const apply = async () => {
    if (!consecSel) return
    const p = await getPedido<Pedido>(consecSel)
    setApplied(p)
    setItems(p?.lines ?? [])
  }

  const setQty     = (id: string, qty: number) => setItems(prev => prev.map(l => (l.id === id ? { ...l, qty } : l)))
  const removeItem = (id: string)              => setItems(prev => prev.filter(l => l.id !== id))

  // Admin: agrega un insumo específico del catálogo a la orden (si no está ya).
  const cargarInsumo = (id: string) => {
    const v = catalog.find(c => c.id === id)
    if (!v) return
    setItems(prev => (prev.some(l => l.id === id) ? prev : [...prev, { id, varietyName: v.name, qty: 1 }]))
  }

  const approve = () => {
    if (items.length === 0 || !proveedor) return
    const seq    = (parseInt(localStorage.getItem('po_orden_seq') ?? '0', 10) || 0) + 1
    const numero = `OC-${String(seq).padStart(4, '0')}`
    const orden: Orden = { numero, proveedor, origen: applied?.consecutivo ?? '', lines: items, createdAt: Date.now() }
    void saveOrden(numero, orden)   // consigna en IndexedDB → la lee Recepción
    localStorage.setItem('po_orden_seq', String(seq))
    console.info('[PurchaseOrders] orden generada:', JSON.stringify(orden, null, 2))
    toast.success(`Orden ${numero} generada y enviada a ${proveedor}`)
    // limpia → listo para la próxima orden
    setItems([]); setApplied(null); setConsecSel(''); setProveedor(''); setShowSearch(false)
  }

  const columns: TableColumn<PedidoLine>[] = [
    { key: 'varietyName', header: 'Insumo', sortable: true },
    {
      key:    'qty',
      header: 'Cantidad',
      render: (line: PedidoLine) => (
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={line.qty || ''}
          onChange={e => setQty(line.id, Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
          className="w-24 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ),
    },
    {
      key:    'actions',
      header: '',
      render: (line: PedidoLine) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeItem(line.id)}
          className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Quitar insumo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Orden de Compra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisá el requerimiento por proveedor y generá la orden — prototipo
        </p>
      </div>

      {/* ── FilterCard ── */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Filtrado de Requerimiento</span>
        </div>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Proveedor</label>
            <Combobox
              options={PROVEEDORES.map(p => ({ value: p, label: p }))}
              value={proveedor}
              onChange={setProveedor}
              placeholder="Buscar proveedor…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nº Consecutivo</label>
            <Combobox
              options={pedidos.map(p => ({ value: p.consecutivo, label: p.consecutivo, badge: p.location }))}
              value={consecSel}
              onChange={setConsecSel}
              placeholder={pedidos.length === 0 ? 'Sin pedidos' : 'Elegí un pedido'}
              emptyMessage="No hay pedidos confirmados"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Centro de Costo</label>
            <div className="flex items-center rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-sm text-foreground">
              {selectedPedido?.location || '—'}
            </div>
          </div>
          <Button onClick={apply} disabled={!consecSel} className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Aplicar
          </Button>
        </div>
      </div>

      {/* ── Items (67%) | Resumen (33%) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">

        {/* Items */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Revisión de Pedidos de Insumos</h2>
            <p className="text-sm text-muted-foreground">Validá las cantidades antes de generar la orden</p>
          </div>
          <DataTable
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Cargar Insumo (izquierda): el "+" abre el buscador del catálogo */}
                {showSearch ? (
                  <div className="flex w-full items-center gap-1.5 sm:w-72">
                    <div className="min-w-0 flex-1">
                      <Combobox
                        options={catalog.map(c => ({ value: c.id, label: c.name }))}
                        value=""
                        onChange={cargarInsumo}
                        placeholder="Buscar insumo…"
                        emptyMessage="Sin catálogo"
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowSearch(false)} aria-label="Cerrar">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => setShowSearch(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Cargar insumo
                  </Button>
                )}
                {/* Contador (derecha, badge como las otras tablas) */}
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {items.length}
                </span>
              </div>
            }
            columns={columns}
            data={items}
            rowKey={l => l.id}
            emptyMessage={applied ? 'El pedido no tiene insumos.' : 'Elegí un consecutivo y aplicá los filtros.'}
          />
        </div>

        {/* Resumen de Orden — mismo estilo de tabla que Items en Requirements */}
        <div className="flex flex-col gap-3 lg:col-span-1">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Resumen de Orden</h2>
            </div>
            <div className="divide-y divide-border/60">
              <SummaryRow label="Proveedor"        value={proveedor || '—'} />
              <SummaryRow label="Items totales"     value={items.length > 0 ? String(items.length) : '—'} />
              <SummaryRow label="Consecutivo Orig." value={applied?.consecutivo ?? '—'} />
            </div>
          </div>
          <Button onClick={approve} disabled={items.length === 0 || !proveedor} className="w-full gap-2">
            <Send className="h-4 w-4" /> Aprobar y Generar Orden
          </Button>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}
