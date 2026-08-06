import { Fragment, useState, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'

export interface TableColumn<T> {
  key:        string
  header:     ReactNode   // texto normal, o un elemento (ej. "Agregar todos" clickeable en la columna del +)
  render?:    (row: T) => ReactNode
  sortable?:  boolean
  align?:     'left' | 'center' | 'right'   // alineación de header + celda (default left)
  mobileLabel?: string    // label in mobile card view
  hideMobile?: boolean    // hide this column on mobile cards
}

const alignCls = (a?: 'left' | 'center' | 'right') => (a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left')

interface DataTableProps<T> {
  columns:      TableColumn<T>[]
  data:         T[]
  rowKey:       (row: T) => string
  emptyMessage?: string
  mobileCard?:  (row: T) => ReactNode  // custom mobile card renderer
  toolbar?:     ReactNode               // barra opcional DENTRO de la tabla (buscador, filtros…)
  renderExpanded?: (row: T) => ReactNode  // fila full-width debajo (si devuelve truthy). Ej. comentario de rechazo.
  pageSize?:    number                  // si se define → pagina la tabla (desktop + mobile); sin él, muestra todo
  loading?:     boolean                 // si true → filas skeleton (mantiene shell + columnas) en vez del emptyMessage
}

type SortDir = 'asc' | 'desc' | null

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'No hay datos disponibles.',
  mobileCard,
  toolbar,
  renderExpanded,
  pageSize,
  loading = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [page,    setPage]    = useState(0)

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return }
    if (sortDir === 'asc')  { setSortDir('desc'); return }
    setSortKey(null); setSortDir(null)
  }

  const sorted = sortKey && sortDir
    ? [...data].sort((a, b) => {
        const aVal = String((a as Record<string, unknown>)[sortKey] ?? '')
        const bVal = String((b as Record<string, unknown>)[sortKey] ?? '')
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    : data

  // Paginación (opt-in): si hay pageSize, corta las filas de la página actual.
  const paginate  = pageSize != null && pageSize > 0
  const pageCount = paginate ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const safePage  = Math.min(page, pageCount - 1)
  const paged     = paginate ? sorted.slice(safePage * pageSize, safePage * pageSize + pageSize) : sorted

  const pager = paginate && pageCount > 1 ? (
    <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} / {sorted.length}</span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="Anterior"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
        <span className="px-1 text-muted-foreground">{safePage + 1} / {pageCount}</span>
        <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} aria-label="Siguiente"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  ) : null

  // Ícono en halo neutro (ni primary ni destructive: no es una acción ni un error, es
  // informativo) + texto más oscuro que antes (era text-muted-foreground puro) para que
  // el estado "vacío" pese más que un simple placeholder gris y se note de un vistazo.
  const empty = (
    <div className="flex flex-col items-center justify-center gap-3 bg-card py-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
    </div>
  )

  // Header reusable (se muestra igual con datos o con skeleton, para que el shell no salte).
  const head = (
    <thead>
      <tr className="border-b border-border bg-muted/40">
        {columns.map(col => (
          <th key={col.key} className={`px-4 py-3 text-xs font-semibold text-muted-foreground ${alignCls(col.align)}`}>
            {col.sortable ? (
              <button type="button" onClick={() => handleSort(col.key)}
                className={`flex items-center gap-1 hover:text-foreground ${col.align === 'center' ? 'mx-auto' : col.align === 'right' ? 'ml-auto' : ''}`}>
                {col.header}
                <SortIcon active={sortKey === col.key} dir={sortDir} />
              </button>
            ) : (
              col.header
            )}
          </th>
        ))}
      </tr>
    </thead>
  )

  // Filas huesos mientras la petición está en curso (loading). Mantiene columnas + toolbar.
  const skeletonBody = (
    <tbody className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          {columns.map(col => (
            <td key={col.key} className={`px-4 py-3 ${alignCls(col.align)}`}>
              <div className="h-4 w-24 max-w-full animate-pulse rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
  const skeletonCards = Array.from({ length: 4 }).map((_, i) => (
    <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 h-4 w-32 max-w-full animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3">
        {columns.slice(0, 4).map(col => <div key={col.key} className="h-4 w-20 max-w-full animate-pulse rounded bg-muted" />)}
      </div>
    </div>
  ))

  return (
    <>
      {/* ── Desktop table ── */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        {toolbar && <div className="border-b border-border px-4 py-3">{toolbar}</div>}
        {loading ? (
          <div className="overflow-x-auto"><table className="w-full text-sm">{head}{skeletonBody}</table></div>
        ) : sorted.length === 0 ? empty : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {head}
              <tbody className="divide-y divide-border">
                {paged.map(row => {
                  const expanded = renderExpanded?.(row)
                  return (
                    <Fragment key={rowKey(row)}>
                      <tr className="transition-colors hover:bg-muted/30">
                        {columns.map(col => (
                          <td key={col.key} className={`px-4 py-3 text-foreground ${alignCls(col.align)}`}>
                            {col.render
                              ? col.render(row)
                              : String((row as Record<string, unknown>)[col.key] ?? '—')}
                          </td>
                        ))}
                      </tr>
                      {expanded ? (
                        <tr><td colSpan={columns.length} className="px-4 pb-3 pt-0">{expanded}</td></tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && pager}
      </div>

      {/* ── Mobile cards ── */}
      <div className="flex flex-col gap-3 md:hidden">
        {toolbar && <div className="rounded-xl border border-border bg-card px-4 py-3">{toolbar}</div>}
        {loading ? (
          skeletonCards
        ) : sorted.length === 0 ? (
          <div className="overflow-hidden rounded-xl border border-border">{empty}</div>
        ) : (
          paged.map(row => {
            const expanded = renderExpanded?.(row)
            return (
              <div key={rowKey(row)} className="flex flex-col gap-2">
                {mobileCard ? mobileCard(row) : <DefaultMobileCard row={row} columns={columns} />}
                {expanded}
              </div>
            )
          })
        )}
        {!loading && pager && <div className="overflow-hidden rounded-xl border border-border bg-card">{pager}</div>}
      </div>
    </>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || !dir) return <ChevronsUpDown className="h-3 w-3 opacity-40" />
  return dir === 'asc'
    ? <ChevronUp   className="h-3 w-3" />
    : <ChevronDown className="h-3 w-3" />
}

function DefaultMobileCard<T>({ row, columns }: { row: T; columns: TableColumn<T>[] }) {
  const visible = columns.filter(c => !c.hideMobile)
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {visible.map(col => (
          <div key={col.key}>
            <dt className="text-xs text-muted-foreground">{col.mobileLabel ?? col.header}</dt>
            <dd className="text-sm font-medium text-foreground">
              {col.render
                ? col.render(row)
                : String((row as Record<string, unknown>)[col.key] ?? '—')}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
