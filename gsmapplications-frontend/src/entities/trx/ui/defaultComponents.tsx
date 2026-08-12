import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ChevronDown, Check, Plus, Search, Filter, X, Trash2, CalendarIcon, Loader2, SlidersHorizontal } from 'lucide-react'
import { Combobox } from '@/shared/ui/combobox'
import { Button } from '@/shared/ui/button'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { FilterBar, FilterField } from '@/shared/ui/filter-bar'
import { ErrorState } from '@/shared/components/ErrorState'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/shared/ui/dropdown-menu'
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/ui/popover'
import { Calendar } from '@/shared/ui/calendar'
import { getValueByPath } from '@/shared/lib/pathResolver'
import type { ComponentNode, RuntimeCtx, SearchConfig, FilterConfig, TrxField } from '../model/runtime'
import { overMax } from '../registry/renderers'

const countBadge = (n: number) => (
  <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{n}</span>
)
// Clases literales para que Tailwind no las purgue (span/cols dinámicos no funcionan).
const COL_SPAN: Record<number, string> = {
  1: 'lg:col-span-1', 2: 'lg:col-span-2', 3: 'lg:col-span-3', 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6',
  7: 'lg:col-span-7', 8: 'lg:col-span-8', 9: 'lg:col-span-9', 10: 'lg:col-span-10', 11: 'lg:col-span-11', 12: 'lg:col-span-12',
}
const GRID_COLS: Record<number, string> = {
  2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 10: 'lg:grid-cols-10', 12: 'lg:grid-cols-12',
}

// Buscador simple: combo de catálogo → al elegir agrega a la collection.
function TrxSearch({ cfg, ctx }: { cfg: SearchConfig; ctx: RuntimeCtx }) {
  const [catalog, setCatalog] = useState<Record<string, unknown>[]>([])
  const optionValue = cfg.optionValue ?? 'id'
  const optionLabel = cfg.optionLabel ?? 'name'
  useEffect(() => {
    const f = ctx.registry.fetchers[cfg.source]
    if (!f) return
    let cancel = false
    void f(cfg.source, {}).then(e => { if (!cancel) setCatalog(Array.isArray(e.data) ? (e.data as Record<string, unknown>[]) : []) })
    return () => { cancel = true }
  }, [cfg.source, ctx.registry])
  return (
    <Combobox
      options={catalog.map(o => ({ value: String(o[optionValue] ?? ''), label: String(o[optionLabel] ?? '') }))}
      value=""
      onChange={v => { const item = catalog.find(o => String(o[optionValue] ?? '') === v); if (item) ctx.collection.add(item) }}
      placeholder={cfg.placeholder ?? 'Buscar…'}
      emptyMessage="Sin resultados"
    />
  )
}

// Posiciona un panel FIXED bajo (o, si no hay espacio, arriba de) un botón — mismo criterio
// que ya usa el Combobox (calcPos): si abajo hay poco lugar y arriba hay más, voltea. Sin esto,
// en resoluciones bajas el panel se salía por debajo del viewport y, al ser `position:fixed`
// (no vive en el flujo de la página), scrollear la página no lo alcanzaba — quedaba con
// contenido inaccesible. `maxHeight` además tapa el panel a lo que realmente entra, así
// SIEMPRE es scrolleable dentro de sí mismo sin importar la resolución.
interface PopoverPos { top?: number; bottom?: number; left: number; width: number; maxHeight: number }
const POPOVER_MARGIN = 4
function placePopover(anchor: HTMLElement, width: number): PopoverPos {
  const r = anchor.getBoundingClientRect()
  const spaceBelow = window.innerHeight - r.bottom - POPOVER_MARGIN
  const spaceAbove = r.top - POPOVER_MARGIN
  const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
  const flip = spaceBelow < 240 && spaceAbove > spaceBelow
  return flip
    ? { bottom: window.innerHeight - r.top + POPOVER_MARGIN, left, width, maxHeight: Math.max(160, spaceAbove) }
    : { top: r.bottom + POPOVER_MARGIN, left, width, maxHeight: Math.max(160, spaceBelow) }
}

// Picker de catálogo (como Requirements): botón → popover con cascada
// categoría→subcategoría + lista filtrada por prefijo (AggregatedCode) + texto → add.
// El panel va en portal (fixed) para no ser recortado por el card de la tabla.
function CatalogPicker({ cfg, ctx }: { cfg: SearchConfig; ctx: RuntimeCtx }) {
  const cascade = cfg.cascade ?? []
  const optionValue = cfg.optionValue ?? 'id'
  const optionLabel = cfg.optionLabel ?? 'name'
  const prefixField = cfg.prefixField ?? 'sku'
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<Record<string, unknown>[]>([])
  const [baseOpts, setBaseOpts] = useState<Record<string, Record<string, unknown>[]>>({})
  const [sel, setSel] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<PopoverPos | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Productos (una vez) + opciones de los filtros BASE de la cascada.
  useEffect(() => {
    let cancel = false
    void (async () => {
      const pf = ctx.registry.fetchers[cfg.source]
      if (pf) { const e = await pf(cfg.source, {}); if (!cancel) setProducts(Array.isArray(e.data) ? e.data as Record<string, unknown>[] : []) }
      const next: Record<string, Record<string, unknown>[]> = {}
      for (const f of cascade) {
        if (f.dependsOn || !f.source) continue
        const fn = ctx.registry.fetchers[f.source]; if (!fn) continue
        try { const e = await fn(f.source, {}); next[f.key] = Array.isArray(e.data) ? e.data as Record<string, unknown>[] : [] } catch { next[f.key] = [] }
      }
      if (!cancel) setBaseOpts(next)
    })()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.source, ctx.registry])

  // Niveles de cascada: cada dependiente saca opciones de la opción elegida del padre.
  const chosen: Record<string, Record<string, unknown> | undefined> = {}
  const levels = cascade.map(f => {
    const data = f.dependsOn && f.optionsFrom
      ? ((getValueByPath(chosen[f.dependsOn], f.optionsFrom) as Record<string, unknown>[]) ?? [])
      : (baseOpts[f.key] ?? [])
    const pick = data.find(o => String(o[f.optionValue] ?? '') === (sel[f.key] ?? ''))
    chosen[f.key] = pick
    return { f, data, pick }
  })
  const deepest = [...levels].reverse().find(l => l.pick)?.pick
  const prefix = cfg.prefixFrom ? String((deepest as Record<string, unknown> | undefined)?.[cfg.prefixFrom] ?? '') : ''

  const q = query.trim().toLowerCase()
  const filtered = products.filter(p => {
    if (prefix && !String(p[prefixField] ?? '').startsWith(prefix)) return false
    if (q && !String(p[optionLabel] ?? '').toLowerCase().includes(q)) return false
    return true
  })

  const setLevel = (key: string, val: string) => setSel(s => {
    const next = { ...s, [key]: val }
    for (const f of cascade) if (f.dependsOn === key) delete next[f.key]
    return next
  })

  const place = () => { if (btnRef.current) setPos(placePopover(btnRef.current, 360)) }
  const toggle = () => { if (!open) place(); setOpen(o => !o) }

  // Cierra con Escape o click en el backdrop (NO con mousedown global, que pelea con
  // el dropdown del Combobox y cerraba el popover al elegir categoría).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const reposition = () => place()
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', reposition)
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', reposition) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <>
      <Button ref={btnRef} type="button" variant="outline" size="sm" className="gap-2" onClick={toggle}>
        <Plus className="h-4 w-4" /> {cfg.label ? ctx.t(cfg.label) : ctx.t('addSupply')}
      </Button>

      {open && pos && createPortal(
        <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
        <div ref={panelRef}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight, zIndex: 9999 }}
          className="flex flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-popover p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5">
          <div className="grid grid-cols-2 gap-2">
            {levels.map(({ f, data }) => (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <Combobox size="sm"
                  options={data.map(o => ({ value: String(o[f.optionValue] ?? ''), label: String(o[f.optionLabel] ?? '') }))}
                  value={sel[f.key] ?? ''}
                  onChange={v => setLevel(f.key, v)}
                  disabled={!!f.dependsOn && !chosen[f.dependsOn]}
                  placeholder={f.label}
                />
              </div>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={cfg.placeholder ?? 'Buscar insumo…'}
              className="w-full min-w-0 rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="rounded-lg border border-border">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">Sin resultados</p>
            ) : filtered.map(p => {
              const id = String(p[optionValue] ?? '')
              const has = ctx.collection.has(id)
              return (
                <div key={id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/50">
                  <span className="truncate text-foreground">{String(p[optionLabel] ?? '')}</span>
                  <button type="button" onClick={() => ctx.collection.add(p)} disabled={has} aria-label="Agregar"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40">
                    {has ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
        </>,
        document.body,
      )}
    </>
  )
}

// Picker "Cargar insumo": botón junto al buscador → cascada categoría→subcategoría (REUSA
// las categorías ya traídas, sin re-fetch) + lista del catálogo (1 solo llamado) filtrada
// por el skuPrefix de la subcategoría elegida en el picker. Elegir agrega la fila a la tabla.
function AddProductPicker({ ctx, source, categoryFilters }: { ctx: RuntimeCtx; source: string; categoryFilters: FilterConfig[] }) {
  const [open, setOpen]       = useState(false)
  const [catalog, setCatalog] = useState<Record<string, unknown>[]>([])
  const [query, setQuery]     = useState('')
  const [pos, setPos]         = useState<PopoverPos | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Catálogo: 1 solo fetch (al abrir la 1ª vez); después se filtra en cliente.
  useEffect(() => {
    if (!open || catalog.length) return
    const f = ctx.registry.fetchers[source]
    if (!f) return
    let cancel = false
    void f(source, {}).then(e => { if (!cancel) setCatalog(Array.isArray(e.data) ? e.data as Record<string, unknown>[] : []) })
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source])

  // Categoría/subcategoría YA NO son propias de este picker (antes tenía su propia cascada,
  // duplicada visualmente con la de la tabla) — hereda el `skuPrefix` que YA calcula el motor
  // (el mismo `derive` que usa el filtro de la tabla principal). Sin nada elegido arriba,
  // `skuPrefix` es '' → busca en TODO el catálogo, sin restringir.
  const skuPrefix = ctx.context.skuPrefix ?? ''

  const kf        = ctx.keyField
  const inTable   = new Set(ctx.rows.map(r => String(r[kf] ?? '')))
  const q         = query.trim().toLowerCase()
  const filtered  = catalog.filter(p => {
    if (inTable.has(String(p[kf] ?? '')))                            return false   // ya está en la tabla
    if (skuPrefix && !String(p.sku ?? '').startsWith(skuPrefix))     return false   // por la subcategoría del picker
    if (q && !String(p.varietyName ?? '').toLowerCase().includes(q)) return false
    return true
  })

  const place = () => { if (btnRef.current) setPos(placePopover(btnRef.current, 360)) }
  const toggle = () => { if (!open) place(); setOpen(o => !o) }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onResize = () => place()
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <>
      <Button ref={btnRef} type="button" variant="outline" size="sm" onClick={toggle}
        className="shrink-0 gap-2 border-primary/20 bg-primary/10 text-primary hover:border-primary/40 hover:bg-primary/20">
        <Plus className="h-4 w-4" /> {ctx.t('addSupply')}
      </Button>
      {open && pos && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div
            style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight, zIndex: 9999 }}
            className="flex flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-popover p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5">
            {/* Mismo estado que los combos de la barra (ctx.context/ctx.setFilter) — no uno propio:
                podés acotar la búsqueda sin cerrar el popover, y como es el MISMO valor, la tabla
                principal queda igual de filtrada, sin nada que sincronizar a mano. */}
            {categoryFilters.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {categoryFilters.map(f => (
                  <Combobox key={f.key} size="sm"
                    options={ctx.options[f.key] ?? []}
                    value={ctx.context[f.key] ?? ''}
                    onChange={v => ctx.setFilter(f.key, v)}
                    placeholder={ctx.t(f.placeholder ?? f.label)}
                    disabled={ctx.locked.has(f.key)}
                  />
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={ctx.t('searchSupply')}
                className="w-full min-w-0 rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="rounded-lg border border-border">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">{ctx.t('noResults')}</p>
              ) : filtered.map(p => (
                <div key={String(p[kf] ?? '')} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/50">
                  <span className="truncate text-foreground">{String(p.varietyName ?? '')}</span>
                  <button type="button" onClick={() => {
                    ctx.addProductRow(p)
                    setQuery('')
                    // Limpia SOLO la subcategoría (no la categoría): es el filtro compartido con
                    // la tabla — si quedara puesta, después de agregar la tabla se ve angosta
                    // ("solo veo el que acabo de agregar") hasta limpiarla a mano.
                    if (categoryFilters.some(f => f.key === 'subcategory')) ctx.setFilter('subcategory', '')
                    toast.success(ctx.t('supplyAdded', { name: String(p.varietyName ?? '') }))
                  }} aria-label="Agregar"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

// Renderiza el buscador del toolbar: picker (si hay cascada) o combo simple.
function renderSearch(cfg: SearchConfig, ctx: RuntimeCtx) {
  return cfg.cascade?.length
    ? <CatalogPicker cfg={cfg} ctx={ctx} />
    : <div className="w-full sm:w-56"><TrxSearch cfg={cfg} ctx={ctx} /></div>
}

// Filtro de fecha ÚNICA (no rango) — mismo patrón visual del rango de fechas de Reportes,
// pero guarda/lee un solo string ISO ("yyyy-MM-dd") en el context, como cualquier otro filtro.
function DateFilterField({ value, onChange, placeholder, disabled, clearLabel }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; clearLabel?: string
}) {
  const selected = value ? new Date(`${value}T00:00:00`) : undefined
  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={`h-auto w-full justify-start gap-2 px-3.5 py-2.5 text-sm font-normal ${selected ? 'pr-8 text-foreground' : 'text-muted-foreground'}`}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-left">{selected ? format(selected, 'dd/MM/yyyy') : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selected} onSelect={d => onChange(d ? format(d, 'yyyy-MM-dd') : '')} />
        </PopoverContent>
      </Popover>
      {/* Hermano del trigger de Radix a propósito: anidado adentro, el click bubblea al
          <button> del Popover y reabre/cierra en vez de solo limpiar. */}
      {selected && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={clearLabel ?? 'clear'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// Barra de filtros. Con `applyLabel`, los combos ESTACIONAN el valor localmente y el
// botón (primary → verde del tenant) confirma todo de una (dispara la carga). Sin él,
// los filtros se auto-aplican al cambiar.
function FiltersBar({ filters, applyLabel, ctx }: { filters: FilterConfig[]; applyLabel?: string; ctx: RuntimeCtx }) {
  const [staged, setStaged] = useState<Record<string, string>>({})
  const apply = !!applyLabel
  const valueOf = (k: string) => (apply ? (staged[k] ?? ctx.context[k] ?? '') : (ctx.context[k] ?? ''))
  const onPick = (f: FilterConfig, v: string) => {
    if (!apply) { ctx.setFilter(f.key, v); return }
    setStaged(s => {
      const next = { ...s, [f.key]: v }
      for (const d of filters) if (d.dependsOn === f.key) delete next[d.key]   // cascada local
      return next
    })
  }
  const renderField = (f: FilterConfig) => (
    <FilterField key={f.key} label={ctx.t(f.label)}>
      {f.input === 'date' ? (
        <DateFilterField
          value={valueOf(f.key)}
          onChange={v => onPick(f, v)}
          placeholder={ctx.t(f.placeholder ?? f.label)}
          disabled={ctx.locked.has(f.key)}
          clearLabel={ctx.t('clearDate')}
        />
      ) : f.input === 'text' ? (
        <input
          value={valueOf(f.key)}
          onChange={e => onPick(f, e.target.value)}
          placeholder={ctx.t(f.placeholder ?? f.label)}
          disabled={ctx.locked.has(f.key)}
          className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      ) : (
        <Combobox
          options={ctx.options[f.key] ?? []}
          value={valueOf(f.key)}
          onChange={v => onPick(f, v)}
          placeholder={ctx.t(f.placeholder ?? f.label)}
          // Combo-desde-resource sin opciones aún → sus params (location…) no están → deshabilitado.
          disabled={ctx.locked.has(f.key) || (!!f.resource && (ctx.options[f.key] ?? []).length === 0)}
        />
      )}
    </FilterField>
  )

  // Agrupa por `section` (default 'main') preservando el orden de primera aparición — tanto de
  // las secciones entre sí como de los filtros dentro de cada una. 'main' son los que de verdad
  // interactúan con la trx (gatillan un resource, filtran la tabla) — se ven inline, como
  // siempre. Cualquier otra sección es dato secundario (no afecta nada) — queda detrás de un
  // botón (su propio nombre traducido, ej. 'option' → "Opciones") que abre un popover, para no
  // competir visualmente con lo que sí importa.
  const mainFields  = filters.filter(f => !f.section || f.section === 'main')
  const extraGroups = new Map<string, FilterConfig[]>()
  for (const f of filters) {
    if (!f.section || f.section === 'main') continue
    if (!extraGroups.has(f.section)) extraGroups.set(f.section, [])
    extraGroups.get(f.section)!.push(f)
  }

  return (
    <FilterBar toggleLabel={ctx.t('filters')}>
      {mainFields.map(renderField)}
      {/* Mismo bloque label+control que cualquier otro campo (label invisible, solo para
          ocupar la misma altura de fila) — así el botón alinea en altura con los combos por
          `items-end`. `width="sm:w-auto"` para que el botón en sí no se estire a los 17.5rem de
          la celda (es corto, no necesita ese ancho) — pero SIGUE ocupando su celda normal del
          grid, en secuencia justo después del último campo `main`, sin ningún truco de posición. */}
      {extraGroups.size > 0 && (
        <FilterField label={<span className="invisible select-none">·</span>} width="sm:w-auto">
          <div className="flex gap-2">
            {[...extraGroups.entries()].map(([section, fields]) => (
              <Popover key={section}>
                <PopoverTrigger asChild>
                  <button type="button"
                    className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
                    <SlidersHorizontal className="h-4 w-4" /> {ctx.t(section)}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-4">
                  <div className="flex flex-col gap-3">{fields.map(renderField)}</div>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </FilterField>
      )}
      {apply && (
        <Button className="w-full gap-2 sm:w-auto" onClick={() => ctx.setContext(c => ({ ...c, ...staged }))}>
          <Filter className="h-4 w-4" /> {applyLabel}
        </Button>
      )}
    </FilterBar>
  )
}

// Multi-select de toolbar: carga opciones de un fetcher y escribe las ELEGIDAS en
// ctx.selections[key]. Las columnas/acciones derivadas leen de ahí (comparativa).
function TrxMultiSelect({ node, ctx }: { node: ComponentNode; ctx: RuntimeCtx }) {
  const cfg = node.select!
  const [options, setOptions] = useState<Record<string, unknown>[]>([])
  useEffect(() => {
    const f = ctx.registry.fetchers[cfg.source]
    if (!f) return
    let cancel = false
    void f(cfg.source, {}).then(e => { if (!cancel) setOptions(Array.isArray(e.data) ? (e.data as Record<string, unknown>[]) : []) })
    return () => { cancel = true }
  }, [cfg.source, ctx.registry])
  const selected = ctx.selections[cfg.key] ?? []
  const isOn = (o: Record<string, unknown>) => selected.some(s => s[cfg.optionValue] === o[cfg.optionValue])
  const toggle = (o: Record<string, unknown>) =>
    ctx.setSelection(cfg.key, isOn(o) ? selected.filter(s => s[cfg.optionValue] !== o[cfg.optionValue]) : [...selected, o])
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {cfg.label} ({selected.length}) <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Sin opciones</div>}
        {options.map(o => (
          <DropdownMenuItem key={String(o[cfg.optionValue] ?? '')} onSelect={e => { e.preventDefault(); toggle(o) }}>
            <Check className={`h-4 w-4 ${isOn(o) ? 'text-primary opacity-100' : 'opacity-0'}`} />
            {String(o[cfg.optionLabel] ?? '')}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Tabla — source 'main' (resource) o 'collection'. Toolbar: `search` (picker de
// catálogo, izq) · `rowFilter` (buscar filas por texto, der) · `select` (multi, der).
// `dynamicFields` = 1 columna por opción de la selección. `expand` = fila full-width.
function TrxTable({ node, ctx }: { node: ComponentNode; ctx: RuntimeCtx }) {
  const [q, setQ] = useState('')
  const isCollection = node.source === 'collection'
  const raw = isCollection ? ctx.collection.items : ctx.rows
  const kf  = node.rowKey ?? ctx.keyField
  const { search, select, dynamicFields: df, categoryFilters: catFilters } = node
  const categoryFilters = catFilters ?? []

  // Filtro cliente por context (ej. categoría → skuPrefix): la fila entra si
  // row[field] empieza con context[prefixFrom]. Vacío = no filtra. Aplica IGUAL a las filas
  // agregadas a mano (`_added`) — es solo un filtro de VISTA sobre esta tabla (no toca el
  // estado ni el carrito), así que no se "pierde" nada: si no matchea la categoría activa
  // queda oculta, con sus datos intactos, hasta que cambies/limpies el filtro.
  const scoped = node.filterBy
    ? raw.filter(r => { const pre = ctx.context[node.filterBy!.prefixFrom] ?? ''; return !pre || String(r[node.filterBy!.field] ?? '').startsWith(pre) })
    : raw

  const query = q.trim().toLowerCase()
  const data = node.rowFilter && query
    ? scoped.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(query)))
    : scoped

  // "Cargar insumo": solo en la tabla principal (no carrito) y si el módulo provee un fetcher CATALOG.
  const showAddPicker = !isCollection && !!ctx.registry.fetchers.CATALOG && node.addSupply !== false

  // "Agregar todos": solo donde ya hay `addButton` por fila (mismo criterio de validez que el
  // botón individual — qty>0 y sin dejar `remaining` en negativo si el campo resta stock;
  // respeta el buscador/filtro de esta tabla, usa `data` no `raw`) — NO reemplaza el `+`
  // individual, va como HEADER de esa misma columna (antes vacío) en vez de un botón aparte.
  const qtyField = (node.fields ?? []).find(f => f.selectorValue === 'qty')
  const addAll = () => {
    for (const row of data) {
      const id = String(row[kf] ?? '')
      if (ctx.collection.has(id)) continue
      const qty = Number(row.qty)
      if (row.qty == null || row.qty === '' || Number.isNaN(qty) || qty === 0) continue
      if (qtyField && overMax(qtyField, row)) continue
      ctx.collection.add(row)
    }
  }

  const tb = node.title || search || select || node.rowFilter || showAddPicker || categoryFilters.length ? (
    // UNA sola fila `flex-wrap` — "Cargar insumo" pegado a la derecha con `ml-auto` (queda
    // igual que antes, full a la derecha) mientras se retoma esto con una referencia visual.
    <div className="flex flex-wrap items-center gap-3">
      {node.title && (
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{ctx.t(node.title)}</h2>{countBadge(raw.length)}
        </div>
      )}
      {search && renderSearch(search, ctx)}
      {node.rowFilter && (
        // `w-full sm:w-64` (no `flex-1`): antes crecía a llenar todo el espacio sobrante del
        // toolbar porque `flex-1` le ganaba al ancho fijo — quedaba gigante en desktop.
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={ctx.t(String(node.placeholder ?? 'search'))}
            className="w-full min-w-0 rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      )}
      {/* Categoría/subcategoría YA NO son un filtro de módulo — viven fijas acá, siempre
          visibles (sin popover/botón — fijo por registry: si el módulo tiene CATEGORIES,
          aparecen solas, nada que declarar en el JSON). Sin label (solo placeholder) para
          no ocupar tanto alto en la barra. */}
      {categoryFilters.map(f => (
        <div key={f.key} className="w-36 sm:w-44">
          <Combobox
            options={ctx.options[f.key] ?? []}
            value={ctx.context[f.key] ?? ''}
            onChange={v => ctx.setFilter(f.key, v)}
            placeholder={ctx.t(f.placeholder ?? f.label)}
            disabled={ctx.locked.has(f.key)}
            size="sm"
          />
        </div>
      ))}
      {(showAddPicker || select) && (
        <div className="ml-auto flex items-center gap-2">
          {showAddPicker && <AddProductPicker ctx={ctx} source="CATALOG" categoryFilters={categoryFilters} />}
          {select && <TrxMultiSelect node={node} ctx={ctx} />}
        </div>
      )}
    </div>
  ) : undefined

  const selected = df ? (ctx.selections[df.from] ?? []) : []
  const selVal = node.select?.optionValue ?? 'id'
  const dynCols: TableColumn<Record<string, unknown>>[] = df
    ? selected.map((opt, i) => ({
        key: `dyn-${df.selector}-${i}`,
        header: df.label.replace(/\{(\w+)\}/g, (_, k) => String(opt[k] ?? '')),
        render: row => {
          const fn = ctx.registry.computeds[df.selector]
          const v = fn ? fn({ ...row, $opt: opt }) : undefined
          const text = v == null || v === '' ? '—' : String(v)
          if (!df.pick) return text
          const id = String(row[kf] ?? '')
          const chosen = String(row[df.pick] ?? '') === String(opt[selVal] ?? '')
          return (
            <div className="flex items-center gap-2">
              <span className={chosen ? 'font-semibold text-primary' : 'text-foreground'}>{text}</span>
              <button
                type="button"
                onClick={() => isCollection && ctx.collection.update(id, { [df.pick!]: chosen ? '' : opt[selVal] })}
                aria-label={chosen ? 'Quitar' : 'Elegir'}
                className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                  chosen ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {chosen ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
            </div>
          )
        },
      }))
    : []

  const renderExpanded = node.expand
    ? (row: Record<string, unknown>) => {
        const r = ctx.registry.renderers[node.expand!]
        return r ? r({ value: undefined, row, field: {} as TrxField, context: ctx.context, setValue: () => {}, collection: ctx.collection, keyField: kf }) : null
      }
    : undefined

  // Contraparte automática de "cargar insumo": misma condición que `showAddPicker` (tabla
  // principal + CATALOG en el registry), sin nada que declarar en el JSON — igual que el
  // picker en sí. Quita una fila `_added` si el usuario se equivocó al agregarla.
  const removeExtraCol: TableColumn<Record<string, unknown>>[] = showAddPicker ? [{
    key: '_removeExtra', header: '',
    render: row => row._added ? (
      <Button
        variant="ghost" size="icon"
        onClick={() => ctx.removeProductRow(String(row[kf] ?? ''))}
        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Quitar" title="Quitar insumo agregado"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    ) : null,
  }] : []

  const columns = [...ctx.makeColumns(node.fields ?? [], kf, isCollection), ...dynCols, ...removeExtraCol]

  // "Agregar todos" reemplaza el header vacío de la columna del `+` (mismo índice que en
  // `node.fields`, ya que `makeColumns` mapea 1:1) — clickeable, misma jerarquía visual que
  // el resto de headers de la tabla, sin agregar un botón aparte en la barra.
  const addBtnIdx = (node.fields ?? []).findIndex(f => f.renderer === 'addButton')
  if (!isCollection && addBtnIdx !== -1 && columns[addBtnIdx]) {
    columns[addBtnIdx] = {
      ...columns[addBtnIdx],
      header: (
        <button type="button" onClick={addAll} className="text-primary hover:underline">
          {ctx.t('addAll')}
        </button>
      ),
    }
  }

  // Card mobile propio: separa la fila en Título (variedad) · Datos (grilla) · Acción
  // (input + botones abajo). Categoriza por el renderer de cada field (ya normalizado).
  const baseFields = node.fields ?? []
  const mobileCard = (r: Record<string, unknown>) => {
    const cells   = baseFields.map((f, i) => ({ f, col: columns[i] })).filter(c => c.col)
    const title   = cells.find(c => c.f.selectorValue === 'varietyName')
    const rest    = cells.filter(c => c !== title)
    const actions = rest.filter(c => /button/i.test(c.f.renderer ?? ''))
    const inputs  = rest.filter(c => /input/i.test(c.f.renderer ?? ''))
    const data    = rest.filter(c => !actions.includes(c) && !inputs.includes(c))
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        {title && <p className="mb-3 text-sm font-semibold text-foreground">{title.col.render?.(r)}</p>}
        {data.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {data.map((c, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{c.col.header}</dt>
                <dd className="text-sm font-medium text-foreground">{c.col.render?.(r)}</dd>
              </div>
            ))}
          </dl>
        )}
        {(inputs.length > 0 || actions.length > 0) && (
          <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
            <div className="flex flex-1 flex-col gap-1">
              {inputs.map((c, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{c.col.header}</span>
                  {c.col.render?.(r)}
                </div>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end">
              {actions.map((c, i) => <span key={i}>{c.col.render?.(r)}</span>)}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Estados de la tabla principal (no aplica al carrito): gated · loading (skeleton) · error
  // (inline + retry) · noData. El carrito usa su propio hint. `gated` = falta CUALQUIER param
  // que pida el resource principal (no necesariamente location — puede ser un combo-desde-resource
  // como "N° de recepción" — por eso el mensaje no puede nombrar un filtro específico).
  const gated     = !isCollection && !ctx.ready
  const showError = !isCollection && ctx.ready && !ctx.loading && !!ctx.error
  const emptyMsg  = isCollection ? 'addProductsHint' : gated ? 'pickFilters' : 'noData'

  // Fallo de carga de data: el shell (filtros arriba) queda; la zona de la tabla muestra
  // el error con Reintentar (design system), en vez de "sin datos" silencioso.
  if (showError) return <ErrorState error={ctx.error} onRetry={ctx.retry} />

  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={r => String(r[kf] ?? '')}
      emptyMessage={ctx.t(emptyMsg)}
      loading={!isCollection && ctx.ready && ctx.loading && ctx.rows.length === 0}
      toolbar={tb}
      renderExpanded={renderExpanded}
      mobileCard={mobileCard}
      pageSize={10}
    />
  )
}

// Drawer lateral (derecha): un botón que abre un panel con `children` (ej. resumen
// de revisión + confirmar). Se DELIMITA al área de contenido (`<main>`) para no tapar
// el navbar ni el sidebar. Cierra con ✕, backdrop o Escape.
function TrxDrawer({ node, ctx }: { node: ComponentNode; ctx: RuntimeCtx }) {
  const [open, setOpen] = useState(false)
  const [box, setBox]   = useState<{ top: number; left: number } | null>(null)
  const measure = () => {
    const r = document.querySelector('main')?.getBoundingClientRect()
    setBox(r ? { top: r.top, left: r.left } : { top: 0, left: 0 })
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onResize = () => measure()
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize) }
  }, [open])
  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => { measure(); setOpen(true) }}>{ctx.t(node.trigger ?? 'continue')}</Button>
      </div>
      {open && box && createPortal(
        <>
          <div style={{ position: 'fixed', top: box.top, left: box.left, right: 0, bottom: 0, zIndex: 40 }}
            className="bg-black/40" onClick={() => setOpen(false)} />
          <div style={{ position: 'fixed', top: box.top, right: 0, bottom: 0, zIndex: 40 }}
            className="flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">{ctx.t(node.title ?? 'summary')}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              {(node.children ?? []).map((c, i) => ctx.renderNode(c, i))}
            </div>
            {node.footerActions === true && (() => {
              const ts = ctx.transitions.filter(t => t.label)   // acciones del workflow del estado actual
              return ts.length ? (
                <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
                  {ts.map((t, i) => {
                    const reason = ctx.blockReason(t)
                    return (
                      <div key={t.label ?? i} className="flex flex-col gap-1">
                        <Button variant={t.variant ?? 'default'} onClick={() => ctx.fire(t)} disabled={!ctx.canFire(t)} className="w-full">
                          {ctx.submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {ctx.t(t.label ?? '')}
                        </Button>
                        {/* Neutro, no destructive: "falta completar X" es guía, no un error —
                            el rojo se ve como que algo salió mal apenas se entra al módulo. */}
                        {reason && <p className="text-center text-xs text-muted-foreground">{reason}</p>}
                      </div>
                    )
                  })}
                </div>
              ) : null
            })()}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

/**
 * Componentes built-in — REUSAN shared/ui. El JSON los usa por `type` y solo los
 * LLENA (datos/labels); el layout/responsive vive ACÁ (dentro del componente).
 * El registry del app puede overridear un `type` o agregar tipos nuevos.
 */
export const DEFAULT_COMPONENTS: Record<string, (node: ComponentNode, ctx: RuntimeCtx) => ReactNode> = {
  // Encabezado de sección (h2). Opcional: `badge` (computed) → pill con un conteo/total.
  // `$items` = carrito (collection) · `$rows` = tabla principal — módulos SIN carrito
  // (ej. Factura, `summary:false`) usan `$rows` para un total, los que sí tienen carrito
  // (ej. OCM) usan `$items`. El computed elige cuál leer.
  heading: (node, ctx) => {
    const badge = node.badge ? ctx.registry.computeds[node.badge]?.({ $items: ctx.collection.items, $rows: ctx.rows }) : null
    return (
      // `justify-between`: antes el título y el badge quedaban pegados a la izquierda aunque
      // la fila ocupara todo el ancho (el div es block, no encoge a su contenido) — el badge
      // se veía apretado contra el texto en vez de separado, limpio, a la derecha.
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{ctx.t(node.title ?? '')}</h2>
        {/* `rounded-lg` (no `rounded-full`): esto ya no es un conteo cortito ("5") sino
            valores más largos (totales en $) — el pill circular se veía apretado/raro. */}
        {badge != null && badge !== '' && (
          <span className="rounded-lg border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-base font-semibold text-primary">{String(badge)}</span>
        )}
      </div>
    )
  },

  // Nota / aclaración (texto tenue).
  note: node => <p className="text-sm text-muted-foreground">{node.text}</p>,

  // Drawer lateral disparado por un botón (`trigger`) con `children` adentro.
  drawer: (node, ctx) => <TrxDrawer node={node} ctx={ctx} />,

  // Lista de REVISIÓN: filas (collection o `source:'main'`) como cards (título +
  // label-valor). `when` (computed) filtra cuáles entran. Ej. "resumen del gasto" /
  // "resumen de cambios" antes de confirmar.
  reviewList: (node, ctx) => {
    const src = node.source === 'main' ? ctx.rows : ctx.collection.items
    const whenFn = node.when ? ctx.registry.computeds[node.when] : null
    const items = whenFn ? src.filter(r => !!whenFn(r)) : src
    return (
      <div className="flex flex-col gap-3">
        {node.title && (
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{ctx.t(node.title)}</h2>{countBadge(items.length)}
          </div>
        )}
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {node.emptyText ?? 'Sin registros aún.'}
          </div>
        ) : items.map((row, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3 shadow-sm">
            {node.titleField && <p className="mb-2 text-sm font-semibold text-foreground">{String(row[node.titleField] ?? '')}</p>}
            <dl className="flex flex-col gap-1">
              {(node.fields ?? []).map((f, j) => (
                <div key={j} className="flex items-center justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">{ctx.t(f.label ?? '')}</dt>
                  <dd className="text-sm font-medium text-foreground">{ctx.renderField(f, row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    )
  },

  // Barra de filtros (self-contained). Con `apply` confirma con botón; si no, auto-aplica.
  filters: (node, ctx) => {
    const filters = node.filters ?? []
    return filters.length === 0 ? null : <FiltersBar filters={filters} applyLabel={node.apply} ctx={ctx} />
  },

  // Tabla — ver TrxTable (soporta search/rowFilter/select/dynamicFields/expand).
  table: (node, ctx) => <TrxTable node={node} ctx={ctx} />,

  // grid: layout CSS (grid-cols-N). Cada hijo ocupa `span` (col-span). El RATIO
  // se controla desde el JSON con span (7/3 = 70/30 · 5/5 = 50/50 · …).
  grid: (node, ctx) => {
    const cols = node.cols ?? 10
    return (
      <div className={`grid grid-cols-1 gap-6 ${GRID_COLS[cols] ?? 'lg:grid-cols-10'} lg:items-start`}>
        {(node.children ?? []).map((c, i) => (
          <div key={i} className={COL_SPAN[c.span ?? cols] ?? ''}>{ctx.renderNode(c, i)}</div>
        ))}
      </div>
    )
  },

  // stack: apila los hijos en vertical (flex-col).
  stack: (node, ctx) => (
    <div className="flex flex-col gap-3">
      {(node.children ?? []).map((c, i) => ctx.renderNode(c, i))}
    </div>
  ),

  // Card: muestra UN registro como label-valor. Consume los MISMOS `fields`.
  card: (node, ctx) => {
    const fields = node.fields ?? []
    const row = ctx.rows[0] ?? {}   // (por ahora el 1er registro; luego se puede parametrizar)
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        {node.title && <h2 className="mb-3 text-sm font-semibold text-foreground">{ctx.t(node.title)}</h2>}
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((f, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{ctx.t(f.label ?? '')}</dt>
              <dd className="text-sm font-medium text-foreground">{ctx.renderField(f, row)}</dd>
            </div>
          ))}
        </dl>
      </div>
    )
  },

  // Resumen: label-valor con agregados (context + count/items de la collection).
  summary: (node, ctx) => {
    const data = { ...ctx.context, count: ctx.collection.items.length, items: ctx.collection.items }
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {node.title && <div className="border-b border-border px-4 py-3"><h2 className="text-sm font-semibold text-foreground">{ctx.t(node.title)}</h2></div>}
        <div className="divide-y divide-border/60">
          {(node.fields ?? []).map((f, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">{ctx.t(f.label ?? '')}</span>
              <span className="text-sm font-semibold text-foreground">{ctx.renderField(f, data)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },

  // Cargar insumo: buscador de catálogo (combo simple o picker con cascada).
  search: (node, ctx) => renderSearch(node.search ?? {
    source: String(node.source ?? ''), optionValue: node.optionValue, optionLabel: node.optionLabel, placeholder: node.placeholder,
  }, ctx),
}
