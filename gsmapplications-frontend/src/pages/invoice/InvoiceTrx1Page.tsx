import { useEffect, useState } from 'react'
import { Combobox } from '@/shared/ui/combobox'
import { Button } from '@/shared/ui/button'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { SlidersHorizontal, CheckCircle2, Save, Trash2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { listRecepciones, getRecepcion, saveFactura } from '@/shared/lib/idb'
import type { Recepcion, Factura, FacturaLine } from '@/entities/order'

// Línea de factura: nombre y cantidad editables (se factura lo recibido).
type FacRow = FacturaLine

export default function InvoicePage() {
  const [recepciones, setRecepciones] = useState<Recepcion[]>([])
  const [sel,     setSel]     = useState('')
  const [applied, setApplied] = useState<Recepcion | null>(null)
  const [items,   setItems]   = useState<FacRow[]>([])

  // Recepciones registradas (para el combo). Se factura sobre lo recibido.
  useEffect(() => { listRecepciones<Recepcion>().then(setRecepciones) }, [])

  const apply = async () => {
    if (!sel) return
    const r = await getRecepcion<Recepcion>(sel)
    setApplied(r)
    // La factura arranca con lo recibido (qty = recibida), editable.
    setItems((r?.lines ?? []).map(l => ({ id: l.id, nombre: l.varietyName, qty: l.recibida })))
  }

  const setNombre  = (id: string, nombre: string) => setItems(prev => prev.map(l => (l.id === id ? { ...l, nombre } : l)))
  const setQty     = (id: string, qty: number)    => setItems(prev => prev.map(l => (l.id === id ? { ...l, qty } : l)))
  const removeItem = (id: string)                 => setItems(prev => prev.filter(l => l.id !== id))

  const save = () => {
    if (items.length === 0) return
    const seq    = (parseInt(localStorage.getItem('fac_seq') ?? '0', 10) || 0) + 1
    const numero = `FAC-${String(seq).padStart(4, '0')}`
    const factura: Factura = { numero, origen: applied?.numero ?? '', lines: items, createdAt: Date.now() }
    void saveFactura(numero, factura)   // consigna en IndexedDB → continúa el flujo (pagos/reportes)
    localStorage.setItem('fac_seq', String(seq))
    console.info('[Invoice] factura guardada:', JSON.stringify(factura, null, 2))
    toast.success(`Factura ${numero} guardada correctamente`)
    setItems([]); setApplied(null); setSel('')
  }

  const columns: TableColumn<FacRow>[] = [
    {
      key:    'nombre',
      header: 'Insumo',
      render: (row: FacRow) => (
        <input
          type="text"
          value={row.nombre}
          onChange={e => setNombre(row.id, e.target.value)}
          className="w-full min-w-0 rounded-md border border-border bg-background px-2.5 py-1 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ),
    },
    {
      key:    'qty',
      header: 'Cantidad',
      render: (row: FacRow) => (
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={row.qty || ''}
          onChange={e => setQty(row.id, Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
          placeholder="0"
          className="w-24 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ),
    },
    {
      key:    'remove',
      header: '',
      render: (row: FacRow) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeItem(row.id)}
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
        <h1 className="text-2xl font-bold text-foreground">Facturas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generá la factura sobre lo recibido — ajustá nombre y cantidad de cada insumo — prototipo
        </p>
      </div>

      {/* ── Filtrado de factura ── */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Filtrado de Factura</span>
        </div>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Número de orden recibida</label>
            <Combobox
              options={recepciones.map(r => ({ value: r.numero, label: r.numero }))}
              value={sel}
              onChange={setSel}
              placeholder={recepciones.length === 0 ? 'Sin recepciones' : 'Elige una recepción'}
              emptyMessage="No hay recepciones registradas"
            />
          </div>
          <Button onClick={apply} disabled={!sel} className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Aplicar Filtros
          </Button>
        </div>
      </div>

      {/* ── Detalle de insumos (factura) ── */}
      <div className="flex flex-col gap-3">
        <DataTable
          toolbar={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Detalle de Insumos (Factura)</h2>
                {applied && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{applied.numero}</span>
                )}
              </div>
              {applied && (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{items.length}</span>
              )}
            </div>
          }
          columns={columns}
          data={items}
          rowKey={l => l.id}
          emptyMessage={applied ? 'La recepción no tiene insumos.' : 'Elige una recepción y aplicá los filtros.'}
        />

        <p className="text-xs italic text-muted-foreground">
          ¿Faltan insumos? En una versión real podrías agregarlos manualmente al centro de costo.
        </p>

        <div className="flex justify-end">
          <Button onClick={save} disabled={items.length === 0} className="gap-2 sm:w-auto">
            <Save className="h-4 w-4" /> Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}
