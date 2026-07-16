import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Plus, Search, Filter, X } from 'lucide-react'
import { Combobox } from '@/shared/ui/combobox'
import { Button } from '@/shared/ui/button'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/shared/ui/dropdown-menu'
import { getValueByPath } from '@/shared/lib/pathResolver'
import type { ComponentNode, RuntimeCtx, SearchConfig, FilterConfig, TrxField, WfButton, WfTransition } from '../model/runtime'

const countBadge = (n: number) => (
  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{n}</span>
)
// Clases literales para que Tailwind no las purgue (span/cols dinámicos no funcionan).
const COL_SPAN: Record<number, string> = {
  1: 'lg:col-span-1', 2: 'lg:col-span-2', 3: 'lg:col-span-3', 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6',
  7: 'lg:col-span-7', 8: 'lg:col-span-8', 9: 'lg:col-span-9', 10: 'lg:col-span-10', 11: 'lg:col-span-11', 12: 'lg:col-span-12',
}
const GRID_COLS: Record<number, string> = {
  2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 10: 'lg:grid-cols-10', 12: 'lg:grid-cols-12',
}
// Botones (WfButton) → transiciones salientes del estado actual; label del front.
// `align` (end/center/start) → fila con ancho automático; sin él, apilado full-width.
function buttonBar(buttons: WfButton[], ctx: RuntimeCtx, align?: string) {
  const pairs = buttons
    .map(b => ({ b, t: ctx.transitionFor(b.on) }))
    .filter((x): x is { b: WfButton; t: WfTransition } => !!x.t)
  if (pairs.length === 0) return null
  const inline = align === 'end' || align === 'center' || align === 'start'
  const wrap = inline
    ? `flex flex-wrap gap-3 ${align === 'end' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`
    : 'flex flex-col gap-3'
  return (
    <div className={wrap}>
      {pairs.map(({ b, t }) => (
        <Button key={b.on} variant={b.variant ?? 'default'} onClick={() => ctx.fire(t)} disabled={!ctx.canFire(t)} className={inline ? '' : 'w-full'}>
          {b.label}
        </Button>
      ))}
    </div>
  )
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
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
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

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect(); if (!r) return
    const width = 360
    setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), width })
  }
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
        <Plus className="h-4 w-4" /> {cfg.label ?? 'Cargar…'}
      </Button>

      {open && pos && createPortal(
        <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
        <div ref={panelRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="flex flex-col gap-3 rounded-xl border border-border bg-popover p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5">
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

          <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
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

// Renderiza el buscador del toolbar: picker (si hay cascada) o combo simple.
function renderSearch(cfg: SearchConfig, ctx: RuntimeCtx) {
  return cfg.cascade?.length
    ? <CatalogPicker cfg={cfg} ctx={ctx} />
    : <div className="w-full sm:w-56"><TrxSearch cfg={cfg} ctx={ctx} /></div>
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
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:w-fit">
      {filters.map(f => (
        <div key={f.key} className="flex w-full flex-col gap-1.5 sm:w-60">
          <label className="text-sm font-medium text-foreground">{f.label}</label>
          {f.input === 'text' ? (
            <input
              value={valueOf(f.key)}
              onChange={e => onPick(f, e.target.value)}
              placeholder={f.placeholder ?? f.label}
              disabled={ctx.locked.has(f.key)}
              className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          ) : (
            <Combobox
              options={ctx.options[f.key] ?? []}
              value={valueOf(f.key)}
              onChange={v => onPick(f, v)}
              placeholder={f.placeholder ?? `Selecciona ${f.label.toLowerCase()}`}
              disabled={ctx.locked.has(f.key)}
            />
          )}
        </div>
      ))}
      {apply && (
        <Button className="w-full gap-2 sm:w-auto" onClick={() => ctx.setContext(c => ({ ...c, ...staged }))}>
          <Filter className="h-4 w-4" /> {applyLabel}
        </Button>
      )}
    </div>
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
  const { search, select, dynamicFields: df } = node

  const query = q.trim().toLowerCase()
  const data = node.rowFilter && query
    ? raw.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(query)))
    : raw

  const tb = node.title || search || select || node.rowFilter ? (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {node.title && (
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{node.title}</h2>{countBadge(raw.length)}
          </div>
        )}
        {search && renderSearch(search, ctx)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {node.rowFilter && (
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={String(node.placeholder ?? 'Buscar…')}
              className="w-full min-w-0 rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        )}
        {select && <TrxMultiSelect node={node} ctx={ctx} />}
      </div>
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
        return r ? r({ value: undefined, row, field: {} as TrxField, context: ctx.context, setValue: () => {}, collection: ctx.collection }) : null
      }
    : undefined

  const columns = [...ctx.makeColumns(node.fields ?? [], kf, isCollection), ...dynCols]
  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={r => String(r[kf] ?? '')}
      emptyMessage={isCollection ? 'Cargá productos con el buscador de arriba.' : ctx.loading ? 'Cargando…' : 'Sin datos para esta selección.'}
      toolbar={tb}
      renderExpanded={renderExpanded}
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
        <Button onClick={() => { measure(); setOpen(true) }}>{node.trigger ?? 'Continuar'}</Button>
      </div>
      {open && box && createPortal(
        <>
          <div style={{ position: 'fixed', top: box.top, left: box.left, right: 0, bottom: 0, zIndex: 40 }}
            className="bg-black/40" onClick={() => setOpen(false)} />
          <div style={{ position: 'fixed', top: box.top, right: 0, bottom: 0, zIndex: 40 }}
            className="flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">{node.title ?? 'Resumen'}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              {(node.children ?? []).map((c, i) => ctx.renderNode(c, i))}
            </div>
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
  // Encabezado de sección (h2). Opcional: `badge` (computed) → pill con un conteo.
  heading: (node, ctx) => {
    const badge = node.badge ? ctx.registry.computeds[node.badge]?.({ $items: ctx.collection.items }) : null
    return (
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">{node.title}</h2>
        {badge != null && badge !== '' && (
          <span className="rounded-full bg-chart-1/10 px-2.5 py-0.5 text-xs font-medium text-chart-1">{String(badge)}</span>
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
            <h2 className="text-sm font-semibold text-foreground">{node.title}</h2>{countBadge(items.length)}
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
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
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
        {node.title && <h2 className="mb-3 text-sm font-semibold text-foreground">{node.title}</h2>}
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((f, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
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
        {node.title && <div className="border-b border-border px-4 py-3"><h2 className="text-sm font-semibold text-foreground">{node.title}</h2></div>}
        <div className="divide-y divide-border/60">
          {(node.fields ?? []).map((f, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">{f.label}</span>
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

  // Botones sueltos (para módulos de una tabla). `align` → fila con ancho automático.
  actions: (node, ctx) => buttonBar(node.buttons ?? [], ctx, node.align),
}
