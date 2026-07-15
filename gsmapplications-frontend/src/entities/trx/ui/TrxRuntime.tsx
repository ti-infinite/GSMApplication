import { Fragment, useEffect, useMemo, useRef, useState, type Key } from 'react'
import { MapPin } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { getStoredUser } from '@/shared/lib/auth'
import { getValueByPath } from '@/shared/lib/pathResolver'
import type { TableColumn } from '@/shared/ui/data-table'
import { useTrxData } from '../model/useTrxData'
import { DEFAULT_SELECTORS } from '../model/selectors'
import { httpFetcher } from '../model/engine'
import type { Fetcher } from '../model/engine'
import type {
  JsonConfig, FrontConfig, FilterConfig, TrxField, TrxRegistry, CollectionApi, WfTransition, ComponentNode, RuntimeCtx,
} from '../model/runtime'
import { DEFAULT_COMPONENTS } from './defaultComponents'

type Row = Record<string, unknown>

// Los filtros viven en un component `filters`; el runtime los extrae para el context.
function getFilters(front: FrontConfig): FilterConfig[] {
  const node = front.components?.find(c => c.type === 'filters')
  return node?.filters ?? front.filters ?? []
}

function initialContext(filters: FilterConfig[]): Record<string, string> {
  const ctx: Record<string, string> = {}
  const user = getStoredUser() as Record<string, unknown> | null
  for (const f of filters) {
    if (f.cookieDefault && user) {
      const v = user[f.cookieDefault.field]
      if (v) ctx[f.key] = String(v)
    }
  }
  return ctx
}

// Resuelve el VALOR de un field sobre una fila y lo renderiza — genérico (lo usa
// cualquier componente: tabla, card, etc.).
// Resuelve el valor de un field según su selectorType (dirigido por el JSON).
// COMPUTED → registry.computeds · el resto → selectors (registry override > DEFAULT_SELECTORS).
function resolveValue(f: TrxField, row: Row, registry: TrxRegistry): unknown {
  const type = f.selectorType ?? 'JSON_PATH'
  if (type === 'COMPUTED') return f.selectorValue in registry.computeds ? registry.computeds[f.selectorValue](row) : undefined
  const resolver = registry.selectors?.[type] ?? DEFAULT_SELECTORS[type] ?? DEFAULT_SELECTORS.JSON_PATH
  return resolver(row, f.selectorValue)
}

function renderField(
  f: TrxField, row: Row, registry: TrxRegistry,
  context: Record<string, string>, setValue: (v: unknown) => void, collection: CollectionApi,
) {
  const value = resolveValue(f, row, registry)
  if (f.renderer && f.renderer in registry.renderers) {
    return registry.renderers[f.renderer]({ value, row, field: f, context, setValue, collection })
  }
  return value == null || value === '' ? '—' : String(value)
}

// Si el JSON no trae `components`, se arma una lista plana desde items/collection.
function defaultTree(front: FrontConfig): ComponentNode[] {
  const nodes: ComponentNode[] = []
  if (front.filters?.length) nodes.push({ type: 'filters', filters: front.filters })
  if (front.collection) {
    nodes.push({ type: 'grid', cols: 10, children: [
      { type: 'table', span: 7, source: 'main', title: 'Stock', fields: front.fields ?? [] },
      { type: 'stack', span: 3, children: [
        { type: 'table', source: 'collection', title: front.collection.title, fields: front.collection.fields, rowKey: front.collection.rowKey, target: front.collection.target },
        { type: 'actions', buttons: [] },
      ] },
    ] })
  } else {
    nodes.push({ type: 'table', source: 'main', title: 'Stock', fields: front.fields ?? [] })
    nodes.push({ type: 'actions', buttons: [] })
  }
  return nodes
}

const NO_FETCHER: Fetcher = async () => ({ success: 'false', message: 'sin fetcher', data: [], traceId: null })

/**
 * Renderiza un módulo entero desde su JsonConfig: JsonFront (SDUI: components →
 * registry.components, layout DENTRO del componente) + JsonREA (data por resource,
 * cache IndexedDB) + JsonWorkflow (FSM → estado + botones). La UI reusa shared/ui.
 */
export function TrxRuntime({ config, registry }: { config: JsonConfig; registry: TrxRegistry }) {
  const { JsonFront: front, JsonREA: rea, JsonWorkflow: workflow } = config
  const mainResource = rea.resources[0] ?? null
  const filters = useMemo(() => getFilters(front), [front])

  const [context,        setContext]        = useState<Record<string, string>>(() => initialContext(filters))
  const [fetchedOptions, setFetchedOptions] = useState<Record<string, unknown[]>>({})
  const [selections,     setSelections]     = useState<Record<string, Row[]>>({})
  const [edits,      setEdits]      = useState<Record<string, Record<string, unknown>>>({})
  const [collection, setCollection] = useState<Row[]>([])
  const [state,      setState]      = useState<string>(workflow.initialState)

  // Filtros bloqueados: la cookie ya fijó el valor (usuario con finca asignada).
  const locked = useMemo(() => {
    const s = new Set<string>()
    const user = getStoredUser() as Record<string, unknown> | null
    for (const f of filters) {
      if (f.cookieDefault && user && user[f.cookieDefault.field]) s.add(f.key)
    }
    return s
  }, [filters])

  // Opciones de los filtros BASE (los dependientes derivan de la opción del padre).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next: Record<string, unknown[]> = {}
      for (const f of filters) {
        if (f.dependsOn || !f.source || !(f.source in registry.fetchers)) continue
        try {
          const env = await registry.fetchers[f.source](f.source, {})
          next[f.key] = Array.isArray(env.data) ? env.data : []
        } catch { next[f.key] = [] }
      }
      if (!cancelled) setFetchedOptions(next)
    })()
    return () => { cancelled = true }
  }, [filters, registry])

  // Combos + opción SELECCIONADA por filtro. Cascada: el dependiente saca sus
  // opciones de la opción elegida del padre, en el path `optionsFrom`.
  const { comboOptions, selectedOptions } = useMemo(() => {
    const combo: Record<string, { value: string; label: string }[]> = {}
    const selected: Record<string, unknown> = {}
    for (const f of filters) {
      const data: unknown[] = f.dependsOn && f.optionsFrom
        ? ((getValueByPath(selected[f.dependsOn], f.optionsFrom) as unknown[]) ?? [])
        : (fetchedOptions[f.key] ?? [])
      combo[f.key] = data.map(o => ({
        value: String((o as Record<string, unknown>)?.[f.optionValue] ?? ''),
        label: String((o as Record<string, unknown>)?.[f.optionLabel] ?? ''),
      }))
      selected[f.key] = data.find(o => String((o as Record<string, unknown>)?.[f.optionValue] ?? '') === (context[f.key] ?? ''))
    }
    return { comboOptions: combo, selectedOptions: selected }
  }, [filters, fetchedOptions, context])

  // Context ENRIQUECIDO con valores derivados (front.derive → registry.computeds
  // recibe { ...context, $options } → puede leer la opción elegida de cada filtro).
  const enrichedContext = useMemo(() => {
    const c: Record<string, string> = { ...context }
    for (const d of front.derive ?? []) {
      const fn = registry.computeds[d.compute]
      if (fn) c[d.key] = String(fn({ ...context, $options: selectedOptions } as Record<string, unknown>) ?? '')
    }
    return c
  }, [context, selectedOptions, front, registry])

  const setSelection = (key: string, options: Row[]) => setSelections(s => ({ ...s, [key]: options }))

  // Setea un filtro y RESETEA sus dependientes (cascada).
  const setFilter = (key: string, value: string) => setContext(c => {
    const next = { ...c, [key]: value }
    for (const f of filters) if (f.dependsOn === key) delete next[f.key]
    return next
  })

  const custom      = mainResource && mainResource.id in registry.fetchers ? registry.fetchers[mainResource.id] : undefined
  const canFetch    = !!mainResource && (!!custom || !!mainResource.endpoint)
  const mainFetcher = custom ?? (mainResource?.endpoint ? httpFetcher : NO_FETCHER)
  const { rows, loading } = useTrxData<Row>(canFetch ? mainResource : null, enrichedContext, mainFetcher)

  // Pre-poblar la collection desde un resource (cargar-y-editar: PO/Recepción/…).
  // Re-hidrata sólo cuando cambia el CONTENIDO de las filas (no en cada refetch por
  // otro filtro), para no borrar lo que el usuario cargó/editó en la collection.
  const hydratedSig = useRef<string>('')
  useEffect(() => {
    if (front.initCollection !== 'main') return
    const sig = JSON.stringify(rows)
    if (sig === hydratedSig.current) return
    hydratedSig.current = sig
    setCollection(rows.map(r => ({ ...r })))
  }, [rows, front.initCollection])

  const keyField      = front.rowKey ?? 'id'
  const collectionKey = front.collection?.rowKey ?? keyField

  const effectiveRows = useMemo(
    () => rows.map(r => { const id = String(r[keyField] ?? ''); return edits[id] ? { ...r, ...edits[id] } : r }),
    [rows, edits, keyField],
  )

  const collectionApi: CollectionApi = {
    items:  collection,
    add:    row => setCollection(prev => {
      const id = String(row[collectionKey] ?? '')
      return prev.some(r => String(r[collectionKey] ?? '') === id)
        ? prev.map(r => (String(r[collectionKey] ?? '') === id ? row : r))
        : [...prev, row]
    }),
    remove: id => setCollection(prev => prev.filter(r => String(r[collectionKey] ?? '') !== id)),
    update: (id, patch) => setCollection(prev => prev.map(r => (String(r[collectionKey] ?? '') === id ? { ...r, ...patch } : r))),
    has:    id => collection.some(r => String(r[collectionKey] ?? '') === id),
  }

  // Resuelve + dibuja un field sobre una fila (con edición inline). Genérico: lo usan
  // la tabla y la card. Si la fila viene de la collection, la edición la parchea a la
  // collection; si viene de un resource, va a `edits` (overlay sobre las filas).
  const renderFieldInRow = (f: TrxField, row: Row, kField: string, fromCollection = false): React.ReactNode => {
    const key = f.selectorValue
    const id  = String(row[kField] ?? '')
    const setValue = fromCollection
      ? (v: unknown) => collectionApi.update(id, { [key]: v })
      : (v: unknown) => setEdits(prev => ({ ...prev, [id]: { ...prev[id], [key]: v } }))
    return renderField(f, row, registry, context, setValue, collectionApi)
  }

  // Helper de TABLA: convierte fields → columnas de DataTable.
  const makeColumns = (fields: TrxField[], kField: string, fromCollection = false): TableColumn<Row>[] =>
    fields.map(f => ({
      key:      f.selectorValue || f.label,
      header:   f.label,
      sortable: !f.renderer,
      render:   (row: Row) => renderFieldInRow(f, row, kField, fromCollection),
    }))

  // ── Workflow (FSM) ──
  const transitions = workflow.transitions.filter(t => t.from === state)
  const transitionFor = (on: string) => transitions.find(t => t.on === on)
  const canFire = (t: WfTransition) => {
    if (!t.guard) return true
    const g = registry.guards?.[t.guard]
    return g ? g({ rows: effectiveRows, collection, context, state }) : true
  }
  const fire = (t: WfTransition) => {
    if (!canFire(t)) return
    if (t.event && t.event in registry.actions) {
      registry.actions[t.event]({ rows: effectiveRows, collection, context, state, config, clearCollection: () => setCollection([]) })
    }
    setState(t.to)
  }

  // ── SDUI: cada componente se dibuja por `type` (registry override > default) ──
  const renderNode = (node: ComponentNode, key: Key): React.ReactNode => {
    const comp = registry.components?.[node.type] ?? DEFAULT_COMPONENTS[node.type]
    return comp ? <Fragment key={key}>{comp(node, ctx)}</Fragment> : null
  }

  const ctx: RuntimeCtx = {
    front, rows: effectiveRows, loading, collection: collectionApi,
    context, setContext, setFilter, options: comboOptions, selections, setSelection, locked,
    state, transitions, transitionFor, fire, canFire,
    makeColumns, renderField: (f, row) => renderFieldInRow(f, row, keyField),
    keyField, registry, renderNode,
  }

  const components = front.components ?? defaultTree(front)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{front.title ?? config.prefix}</h1>
          {front.subtitle && <p className="mt-1 text-sm text-muted-foreground">{front.subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(() => {
            const hb = front.headerBadge ? registry.computeds[front.headerBadge]?.(enrichedContext) : null
            if (hb) return (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {String(hb)}
              </span>
            )
            if (front.headerButtons?.length) return front.headerButtons.map(b => {
              const t = transitionFor(b.on)
              return t ? (
                <Button key={b.on} variant={b.variant ?? 'default'} size="sm" onClick={() => fire(t)} disabled={!canFire(t)}>{b.label}</Button>
              ) : null
            })
            return (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                estado: <span className="text-foreground">{state}</span>
              </span>
            )
          })()}
        </div>
      </div>

      {components.map((node, i) => renderNode(node, i))}
    </div>
  )
}
