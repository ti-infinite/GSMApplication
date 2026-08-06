import { useEffect, useState } from 'react'
import { Plus, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/shared/ui/dropdown-menu'
import type { RuntimeCtx } from '@/entities/trx'

// DropdownMenu de Radix a propósito acá (no el Combobox compartido): el Combobox pinta su
// dropdown en un portal a document.body posicionado a mano — dentro de un Dialog de Radix esa
// capa no se separa bien (se ve fundida con lo de atrás, el click cae ambiguo). DropdownMenu es
// de la MISMA familia de Radix que Dialog (mismo sistema de portal/capas), compone bien adentro
// y además ya trae el estilo del design system (bg-popover, sombra, etc.), a diferencia de un
// <select> nativo cuya lista abierta la dibuja el sistema operativo y no se puede estilizar.
function DropdownSelect({ value, onChange, disabled, placeholder, options }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; placeholder: string
  options: { value: string; label: string }[]
}) {
  const selected = options.find(o => o.value === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={`truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>{selected?.label ?? placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 w-(--radix-dropdown-menu-trigger-width) overflow-y-auto">
        {options.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{placeholder}</div>}
        {options.map(o => (
          <DropdownMenuItem key={o.value} onSelect={() => onChange(o.value)}>
            {o.value === value && <Check className="h-3.5 w-3.5 text-primary" />}
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ───────────────────────────────────────────────────────────────────────────
 * Específico de Ajuste (AJT) — NO es un componente del motor. Carga MASIVA de
 * inventario: popup con la misma cascada categoría→subcategoría que ya usa el
 * picker genérico "Cargar insumo", pero de selección MÚLTIPLE (tildar varios y
 * cargarlos todos juntos) en vez de 1 a la vez. Solo agrega filas (variedad) —
 * la cantidad de ajuste se completa después en la tabla, igual que cualquier
 * insumo agregado a mano.
 * ─────────────────────────────────────────────────────────────────────────── */

export function BulkLoadDialog({ ctx, open, onClose }: { ctx: RuntimeCtx; open: boolean; onClose: () => void }) {
  const [catalog, setCatalog] = useState<Record<string, unknown>[]>([])
  const [ownCats, setOwnCats] = useState<Record<string, unknown>[]>([])
  const [sel,     setSel]     = useState<{ category?: string; subcategory?: string }>({})
  const [query,   setQuery]   = useState('')
  const [picked,  setPicked]  = useState<Set<string>>(new Set())

  // Catálogo (1 solo fetch al abrir) + categorías (reusa las del filtro si el módulo ya las trae).
  useEffect(() => {
    if (!open) return
    let cancel = false
    const cf = ctx.registry.fetchers.CATALOG
    if (cf && !catalog.length) void cf('CATALOG', {}).then(e => { if (!cancel) setCatalog(Array.isArray(e.data) ? e.data as Record<string, unknown>[] : []) })
    if ((ctx.filterData.category?.length ?? 0) === 0 && !ownCats.length) {
      const cf2 = ctx.registry.fetchers.CATEGORIES
      if (cf2) void cf2('CATEGORIES', {}).then(e => { if (!cancel) setOwnCats(Array.isArray(e.data) ? e.data as Record<string, unknown>[] : []) })
    }
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const kf      = ctx.keyField
  const inTable = new Set(ctx.rows.map(r => String(r[kf] ?? '')))
  const cats    = ((ctx.filterData.category?.length ? ctx.filterData.category : ownCats) ?? []) as Record<string, unknown>[]
  const catObj  = cats.find(c => String(c.IdCategory ?? '') === (sel.category ?? ''))
  const subs    = (catObj?.Children as Record<string, unknown>[] | undefined) ?? []
  const subObj  = subs.find(s => String(s.IdCategory ?? '') === (sel.subcategory ?? ''))
  const catOpts = cats.map(c => ({ value: String(c.IdCategory ?? ''), label: String(c.Descr ?? '') }))
  const subOpts = subs.map(s => ({ value: String(s.IdCategory ?? ''), label: String(s.Descr ?? '') }))
  const prefix  = String((subObj ?? catObj)?.AggregatedCode ?? '')

  const q = query.trim().toLowerCase()
  const filtered = catalog.filter(p => {
    if (inTable.has(String(p[kf] ?? '')))                             return false   // ya está en la tabla
    if (prefix && !String(p.sku ?? '').startsWith(prefix))            return false
    if (q && !String(p.varietyName ?? '').toLowerCase().includes(q))  return false
    return true
  })

  const toggle = (id: string) => setPicked(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const confirm = () => {
    for (const p of filtered) {
      const id = String(p[kf] ?? '')
      if (picked.has(id)) ctx.addProductRow(p)
    }
    setPicked(new Set())
    setQuery('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ctx.t('loadInventory')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <DropdownSelect options={catOpts} value={sel.category ?? ''}
              onChange={v => setSel({ category: v })} placeholder={ctx.t('category')} />
            <DropdownSelect options={subOpts} value={sel.subcategory ?? ''}
              onChange={v => setSel(s => ({ ...s, subcategory: v }))} disabled={!sel.category} placeholder={ctx.t('subcategory')} />
            <input
              value={query} onChange={e => setQuery(e.target.value)} placeholder={ctx.t('search')}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Alto FIJO (no max-h): no crece/achica con la cantidad de resultados — ~10 filas
              visibles, el resto se ve con scroll. Evita que el popup "salte" de tamaño al filtrar. */}
          <div className="flex h-96 flex-col overflow-y-auto rounded-lg border border-border">
            {filtered.length === 0 ? (
              <p className="flex h-full items-center justify-center px-3 text-center text-sm text-muted-foreground">{ctx.t('noData')}</p>
            ) : filtered.map(p => {
              const id = String(p[kf] ?? '')
              const on = picked.has(id)
              return (
                <button
                  key={id} type="button" onClick={() => toggle(id)}
                  className={`flex items-center gap-2.5 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/40 ${on ? 'bg-primary/5' : ''}`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="text-foreground">{String(p.varietyName ?? '')}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" onClick={onClose}>{ctx.t('cancel')}</Button>
          <Button size="sm" className="gap-1.5" disabled={picked.size === 0} onClick={confirm}>
            <Plus className="h-4 w-4" /> {ctx.t('loadSelected', { count: picked.size })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
