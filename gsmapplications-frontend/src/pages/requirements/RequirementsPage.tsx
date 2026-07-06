import { useState } from 'react'
import { useGetCategories } from '@/shared/api/operations/operations/operations'
import { isSessionActive, getStoredUser } from '@/shared/lib/auth'
import type { StringApiResponse } from '@/shared/api/operations/model'
import type { Category } from '@/entities/product'
import { useTrxData } from '@/entities/trx'
import { Combobox } from '@/shared/ui/combobox'
import { Button } from '@/shared/ui/button'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { Plus, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { MOCK_WAREHOUSES } from './mock/warehouses'
import type { StockRow } from './mock/stockResponse'
import { mockFetcher } from './mock/fetcher'
import { REQUIREMENTS_ITEMS, STOCK_RESOURCE } from './config'

const SAVED_KEY = 'req_active_warehouse'

// Una línea del pedido que se va armando.
interface OrderLine {
  sku:         string
  varietyName: string
  qty:         number
}

// Resuelve la location al entrar: 1) cookie del usuario, 2) pick guardado
// (sobrevive el refresh), 3) vacía → elige del combo. Nunca toca la cookie ni
// selecciona por defecto (usuario sin location → nada seleccionado).
function resolveInitialLocation(): string {
  const userLocation = getStoredUser()?.location
  if (userLocation && MOCK_WAREHOUSES.some(w => w.location === userLocation)) return userLocation
  const saved = localStorage.getItem(SAVED_KEY) ?? ''
  return MOCK_WAREHOUSES.some(w => w.location === saved) ? saved : ''
}

export default function RequirementsPage() {
  // Categorías REALES — mismo endpoint que product/productivity.
  const { data: categories = [] } = useGetCategories({
    query: {
      enabled:   isSessionActive(),
      staleTime: 5 * 60 * 1000,
      select: res => {
        try { return JSON.parse((res.data as StringApiResponse).data ?? '[]') as Category[] }
        catch { return [] }
      },
    },
  })

  const [location,      setLocation]      = useState(resolveInitialLocation)
  const [categoryId,    setCategoryId]    = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [search,        setSearch]        = useState('')
  const [qtys,          setQtys]          = useState<Record<string, string>>({})   // cantidad digitada por fila
  const [order,         setOrder]         = useState<OrderLine[]>([])               // pedido en construcción

  const selectedCategory = categories.find(c => String(c.IdCategory) === categoryId) ?? null
  const subcategories    = selectedCategory?.Children ?? []

  // Data vía el motor: resuelve el resource (fetcher mock) → cache IndexedDB → filas.
  const { rows, loading } = useTrxData<StockRow>(
    location ? STOCK_RESOURCE : null,
    { location, category: categoryId, subcategory: subcategoryId },
    mockFetcher,
  )

  // Buscador: filtra la tabla por nombre de variedad.
  const q = search.trim().toLowerCase()
  const filteredRows = q ? rows.filter(r => r.varietyName.toLowerCase().includes(q)) : rows

  // Agregar una fila al pedido (con la cantidad digitada). Si ya está, actualiza la cantidad.
  const addToOrder = (row: StockRow) => {
    const qty = parseFloat(qtys[row.sku] ?? '')
    if (!qty || qty <= 0) return
    setOrder(prev => {
      const exists = prev.some(l => l.sku === row.sku)
      return exists
        ? prev.map(l => (l.sku === row.sku ? { ...l, qty } : l))
        : [...prev, { sku: row.sku, varietyName: row.varietyName, qty }]
    })
    setQtys(prev => ({ ...prev, [row.sku]: '' }))   // limpia el input tras agregar (queda en Items)
    toast.success(`${row.varietyName} agregado`)
  }

  const removeFromOrder = (sku: string) =>
    setOrder(prev => prev.filter(l => l.sku !== sku))

  // "Confirmar pedido" → serializa el pedido (por ahora log + toast; el POST/TRX viene después).
  const confirmOrder = () => {
    const payload = { location, lines: order }
    console.info('[Requirements] pedido serializado:', JSON.stringify(payload, null, 2))
    toast.success(`Pedido serializado con ${order.length} producto(s)`)
  }

  // ── Tabla 1 (stock): columnas del config + cantidad editable con botón agregar ──
  const stockColumns: TableColumn<StockRow>[] = [
    ...REQUIREMENTS_ITEMS.map(item => ({
      key:      item.selectorValue,
      header:   item.descr,
      sortable: true,
    })),
    {
      key:    'qtyadd',
      header: 'Cantidad',
      render: (row: StockRow) => (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={qtys[row.sku] ?? ''}
            onChange={e => setQtys(prev => ({ ...prev, [row.sku]: e.target.value.replace(/[^0-9.]/g, '') }))}
            onKeyDown={e => { if (e.key === 'Enter') addToOrder(row) }}
            placeholder="0"
            className="w-20 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="icon"
            onClick={() => addToOrder(row)}
            className="shrink-0"
            aria-label="Agregar al pedido"
            title="Agregar al pedido"
          >
            <Plus />
          </Button>
        </div>
      ),
    },
  ]

  // ── Tabla 2 (pedido): variedad · cantidad · eliminar ──
  const orderColumns: TableColumn<OrderLine>[] = [
    { key: 'varietyName', header: 'Variedad', sortable: true },
    { key: 'qty',         header: 'Cant.' },
    {
      key:    'remove',
      header: '',
      render: (line: OrderLine) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeFromOrder(line.sku)}
          className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Quitar del pedido"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Requirements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Módulo dirigido por configuración (TRX) — prototipo
        </p>
      </div>

      {/* ── Filtros en cascada (se habilitan en orden) ── */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Ubicación</label>
          <Combobox
            options={MOCK_WAREHOUSES.map(w => ({ value: w.location, label: w.name, badge: w.location }))}
            value={location}
            onChange={val => {
              setLocation(val)
              localStorage.setItem(SAVED_KEY, val)   // persiste el pick (sobrevive el refresh)
              setCategoryId('')
              setSubcategoryId('')
            }}
            placeholder="Seleccioná una finca"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={`text-sm font-medium ${location ? 'text-foreground' : 'text-muted-foreground'}`}>
            Categoría
          </label>
          <Combobox
            disabled={!location}
            options={categories.map(c => ({ value: String(c.IdCategory), label: c.Descr, badge: c.Code }))}
            value={categoryId}
            onChange={val => { setCategoryId(val); setSubcategoryId('') }}
            placeholder="Seleccioná categoría"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={`text-sm font-medium ${categoryId ? 'text-foreground' : 'text-muted-foreground'}`}>
            Subcategoría
          </label>
          <Combobox
            disabled={!categoryId || subcategories.length === 0}
            options={subcategories.map(c => ({ value: String(c.IdCategory), label: c.Descr, badge: c.Code }))}
            value={subcategoryId}
            onChange={setSubcategoryId}
            placeholder={subcategories.length === 0 ? 'Sin subcategorías' : 'Seleccioná subcategoría'}
          />
        </div>
      </div>

      {/* ── Tablas: Stock (70%) | Pedido (30%) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-10 lg:items-start">

        {/* Tabla 1 — Productos (título + buscador dentro de la tabla) */}
        <div className="lg:col-span-7">
          <DataTable
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">Productos</h2>
                <div className="flex items-center gap-2.5">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar variedad…"
                      className="w-full min-w-0 rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{filteredRows.length}</span>
                </div>
              </div>
            }
            columns={stockColumns}
            data={filteredRows}
            rowKey={r => r.sku}
            emptyMessage={
              loading  ? 'Cargando…'
              : location ? (q ? 'Sin coincidencias.' : 'Sin datos para esta selección.')
              : 'Seleccionar una ubicación para cargar los datos.'
            }
          />
        </div>

        {/* Tabla 2 — Items (misma estructura: título dentro de la tabla) */}
        <div className="flex flex-col gap-3 lg:col-span-3">
          <DataTable
            toolbar={
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">Items</h2>
                {order.length > 0 && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {order.length}
                  </span>
                )}
              </div>
            }
            columns={orderColumns}
            data={order}
            rowKey={l => l.sku}
            emptyMessage="Agregar productos con el botón + de la tabla."
          />

          <Button onClick={confirmOrder} disabled={order.length === 0} className="w-full">
            Confirmar pedido
          </Button>
        </div>
      </div>
    </div>
  )
}
