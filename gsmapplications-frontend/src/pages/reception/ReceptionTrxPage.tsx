import { useEffect, useState } from 'react'
import { Combobox } from '@/shared/ui/combobox'
import { Button } from '@/shared/ui/button'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { SlidersHorizontal, CheckCircle2, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import { listOrdenes, getOrden, saveRecepcion } from '@/shared/lib/idb'
import type { Orden, Recepcion } from '@/entities/order'

// Fila de recepción: lo solicitado (de la orden) vs lo recibido (editable).
interface RecRow {
  id:          string
  varietyName: string
  solicitada:  number
  recibida:    number
}

// Estado según lo recibido vs lo solicitado (misma lógica del flujo diseñado).
function estadoFor(recibida: number, solicitada: number) {
  if (recibida <= 0)         return { label: 'Pendiente', badge: 'bg-muted text-muted-foreground',        dot: 'bg-muted-foreground' }
  if (recibida >= solicitada) return { label: 'Completo',  badge: 'bg-green-500/10 text-green-600',         dot: 'bg-green-500' }
  return                             { label: 'Parcial',   badge: 'bg-amber-500/10 text-amber-600',         dot: 'bg-amber-500' }
}

export default function ReceptionPage() {
  const [ordenes,   setOrdenes]   = useState<Orden[]>([])
  const [ocSel,     setOcSel]     = useState('')
  const [applied,   setApplied]   = useState<Orden | null>(null)
  const [recibidas, setRecibidas] = useState<Record<string, number>>({})   // cantidad recibida por línea

  // Órdenes generadas (para el combo de número de orden).
  useEffect(() => { listOrdenes<Orden>().then(setOrdenes) }, [])

  const cargar = async () => {
    if (!ocSel) return
    const o = await getOrden<Orden>(ocSel)
    setApplied(o)
    setRecibidas({})   // arranca en Pendiente (0) para cada insumo
  }

  const setRecibida = (id: string, val: number) => setRecibidas(prev => ({ ...prev, [id]: val }))

  const rows: RecRow[] = (applied?.lines ?? []).map(l => ({
    id:          l.id,
    varietyName: l.varietyName,
    solicitada:  l.qty,
    recibida:    recibidas[l.id] ?? 0,
  }))

  const completos = rows.filter(r => estadoFor(r.recibida, r.solicitada).label === 'Completo').length

  const register = () => {
    if (!applied || rows.length === 0) return
    const rec: Recepcion = {
      numero:    applied.numero,
      lines:     rows.map(r => ({ id: r.id, varietyName: r.varietyName, solicitada: r.solicitada, recibida: r.recibida })),
      createdAt: Date.now(),
    }
    void saveRecepcion(applied.numero, rec)   // consigna en IndexedDB → la leerá Facturas
    console.info('[Reception] recepción registrada:', JSON.stringify(rec, null, 2))
    toast.success('Recepción registrada correctamente')
  }

  const columns: TableColumn<RecRow>[] = [
    { key: 'varietyName', header: 'Insumo', sortable: true },
    { key: 'solicitada',  header: 'Cant. solicitada' },
    {
      key:    'recibida',
      header: 'Cant. recibida',
      render: (row: RecRow) => (
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={row.recibida || ''}
          onChange={e => setRecibida(row.id, Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
          placeholder="0"
          className="w-24 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ),
    },
    {
      key:    'estado',
      header: 'Estado',
      render: (row: RecRow) => {
        const e = estadoFor(row.recibida, row.solicitada)
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${e.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${e.dot}`} /> {e.label}
          </span>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recepción de Orden de Compra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestioná el ingreso de insumos y verificá las cantidades recibidas contra las solicitadas — prototipo
        </p>
      </div>

      {/* ── Selección de orden ── */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Número de Orden</span>
        </div>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Orden de compra</label>
            <Combobox
              options={ordenes.map(o => ({ value: o.numero, label: o.numero, badge: o.proveedor }))}
              value={ocSel}
              onChange={setOcSel}
              placeholder={ordenes.length === 0 ? 'Sin órdenes' : 'Elegí una orden'}
              emptyMessage="No hay órdenes generadas"
            />
          </div>
          <Button onClick={cargar} disabled={!ocSel} className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Cargar detalle
          </Button>
        </div>
      </div>

      {/* ── Detalle de insumos ── */}
      <div className="flex flex-col gap-3">
        <DataTable
          toolbar={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Detalle de Insumos</h2>
                {applied && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{applied.numero}</span>
                )}
              </div>
              {applied && (
                <span className="text-xs text-muted-foreground">
                  {completos}/{rows.length} completos
                </span>
              )}
            </div>
          }
          columns={columns}
          data={rows}
          rowKey={r => r.id}
          emptyMessage={applied ? 'La orden no tiene insumos.' : 'Elegi una orden y carga el detalle.'}
        />

        <div className="flex justify-end">
          <Button onClick={register} disabled={rows.length === 0} className="gap-2 sm:w-auto">
            <ClipboardCheck className="h-4 w-4" /> Registrar Recepción
          </Button>
        </div>
      </div>
    </div>
  )
}
