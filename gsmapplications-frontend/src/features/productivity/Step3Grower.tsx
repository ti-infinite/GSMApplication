import { useState } from 'react'
import { CheckCircle2, MapPin, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import type { Grower, MasterProduct, EmployeeGroup, AssignmentMode, ParameterAttribute } from './types'

const PAGE_SIZE = 10

interface Props {
  growers:                Grower[]
  itc:                    string
  onItcChange:            (v: string) => void
  productionType:         string
  productionTypes:        ParameterAttribute[]
  onProductionTypeChange: (v: string) => void
  product:                MasterProduct
  mode:                   AssignmentMode
  employeeGroups:         EmployeeGroup[]
  onBack:                 () => void
  onConfirm:              (grower: Grower) => void
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function Step3Grower({
  growers, itc, onItcChange,
  productionType, productionTypes, onProductionTypeChange,
  product, mode, employeeGroups, onBack, onConfirm,
}: Props) {
  const [selected, setSelected] = useState<Grower | null>(null)
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(0)

  const filtered = search.trim()
    ? growers.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.country ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (g.categorySupplier ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : growers

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSearch = (v: string) => { setSearch(v); setPage(0) }

  const totalEmployees = employeeGroups.reduce((s, g) => s + g.employees.length, 0)
  const canConfirm     = !!selected && itc.trim().length > 0 && productionType.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px]">

        {/* ── Left: supplier table with pagination ── */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Productores Disponibles
            <span className="ml-2 font-normal text-muted-foreground/60">({filtered.length})</span>
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, país, categoría..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-8 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="w-8 px-4 py-2.5" />
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">País</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Sin resultados</td>
                    </tr>
                  ) : (
                    paginated.map(grower => (
                      <tr key={grower.id} onClick={() => setSelected(grower)}
                        className={`cursor-pointer transition-colors hover:bg-muted/30 ${selected?.id === grower.id ? 'bg-primary/10' : ''}`}>
                        <td className="px-4 py-3">
                          <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${selected?.id === grower.id ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`}>
                            {selected?.id === grower.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{grower.name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{grower.idThirdSupplier}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {grower.country && <MapPin className="h-3 w-3 shrink-0" />}
                            {grower.country ?? '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {grower.categorySupplier && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{grower.categorySupplier}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="flex flex-col divide-y divide-border md:hidden">
              {paginated.map(grower => (
                <button key={grower.id} type="button" onClick={() => setSelected(grower)}
                  className={`flex items-center gap-3 px-4 py-3 text-left transition-colors ${selected?.id === grower.id ? 'bg-primary/10' : 'hover:bg-muted/30'}`}>
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${selected?.id === grower.id ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`}>
                    {selected?.id === grower.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    {initials(grower.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{grower.name}</p>
                    <p className="text-xs text-muted-foreground">{grower.country ?? grower.idThirdSupplier}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(p => p - 1)} disabled={page === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs font-medium text-foreground">{page + 1} / {totalPages}</span>
                <button type="button" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: selection + fields + summary ── */}
        <div className="flex flex-col gap-4">

          {/* Selected grower */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Grower Seleccionado</p>
            {selected ? (
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-sm font-bold text-primary">
                  {initials(selected.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{selected.name}</p>
                  {selected.country && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{selected.country}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="py-3 text-center text-sm text-muted-foreground">Selecciona un productor de la tabla</p>
            )}
          </div>

          {/* Production Type */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Tipo de Producción
            </label>
            <Combobox
              options={productionTypes.map(a => ({ value: a.code, label: a.shortName, description: a.descr }))}
              value={productionType}
              onChange={onProductionTypeChange}
              placeholder="Selecciona el tipo"
              searchPlaceholder="Buscar tipo..."
              emptyMessage="No hay tipos disponibles"
            />
          </div>

          {/* ITC */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">ITC</label>
            <input
              type="text"
              placeholder="Ej. 149275"
              value={itc}
              onChange={e => onItcChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Resumen</p>
            <dl className="flex flex-col gap-2">
              {[
                { label: 'SKU',       value: product.SKU },
                { label: 'Producto',  value: product.MasterProductName },
                { label: 'Modalidad', value: mode === 'groups' ? `Grupos (${employeeGroups.length})` : 'Individual' },
                { label: 'Empleados', value: String(totalEmployees) },
                { label: 'Tipo',      value: productionTypes.find(t => t.code === productionType)?.shortName ?? '—' },
                { label: 'ITC',       value: itc || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-3 text-sm">
                  <dt className="shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="truncate text-right font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Button variant="ghost" onClick={onBack}>← Atrás</Button>
        <div className="flex items-center gap-3">
          {!selected           && <span className="text-xs text-muted-foreground">Selecciona un productor</span>}
          {selected && !productionType && <span className="text-xs text-amber-600">Selecciona el tipo de producción</span>}
          {selected && productionType && !itc.trim() && <span className="text-xs text-amber-600">Ingresa el ITC</span>}
          <Button onClick={() => selected && onConfirm(selected)} disabled={!canConfirm} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}