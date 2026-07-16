import { Fragment, useState, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface TableColumn<T> {
  key:        string
  header:     string
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
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

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

  const empty = (
    <div className="flex items-center justify-center bg-card py-12">
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    </div>
  )

  return (
    <>
      {/* ── Desktop table ── */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        {toolbar && <div className="border-b border-border px-4 py-3">{toolbar}</div>}
        {sorted.length === 0 ? empty : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {columns.map(col => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${alignCls(col.align)}`}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className={`flex items-center gap-1 hover:text-foreground ${col.align === 'center' ? 'mx-auto' : col.align === 'right' ? 'ml-auto' : ''}`}
                        >
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
              <tbody className="divide-y divide-border">
                {sorted.map(row => {
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
      </div>

      {/* ── Mobile cards ── */}
      <div className="flex flex-col gap-3 md:hidden">
        {toolbar && <div className="rounded-xl border border-border bg-card px-4 py-3">{toolbar}</div>}
        {sorted.length === 0 ? (
          <div className="overflow-hidden rounded-xl border border-border">{empty}</div>
        ) : (
          sorted.map(row => {
            const expanded = renderExpanded?.(row)
            return (
              <div key={rowKey(row)} className="flex flex-col gap-2">
                {mobileCard ? mobileCard(row) : <DefaultMobileCard row={row} columns={columns} />}
                {expanded}
              </div>
            )
          })
        )}
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
