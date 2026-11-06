import { Fragment, useEffect, useMemo, useRef, useState, type Key } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Info, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { getStoredUser } from '@/shared/lib/auth'
import { clearResourcePrefix, getResource, saveResource } from '@/shared/lib/idb'
import { getValueByPath } from '@/shared/lib/pathResolver'
import type { TableColumn } from '@/shared/ui/data-table'
import { useTrxData } from '../model/useTrxData'
import { DEFAULT_SELECTORS } from '../model/selectors'
import { DEFAULT_VALUE_SOURCES } from '../model/valueSources'
import { httpFetcher, resolveResource, resolveParams, paramsReady } from '../model/engine'
import type { Fetcher } from '../model/engine'
import type { Resource } from '../model/types'
import type {
  JsonConfig, FrontConfig, FilterConfig, TrxField, TrxRegistry, CollectionApi, WfTransition, ComponentNode, RuntimeCtx, EventCtx,
} from '../model/runtime'
import { DEFAULT_COMPONENTS } from './defaultComponents'
import { expandFront } from '../model/template'

type Row = Record<string, unknown>

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

// Resuelve el VALOR de un field sobre una fila y lo renderiza
// Resuelve el valor de un field según su selectorType (dirigido por el JSON).
function resolveValue(f: TrxField, row: Row, registry: TrxRegistry, context: Record<string, string>): unknown {
  const type = f.selectorType ?? 'JSON_PATH'
  const sel  = f.selectorValue ?? ''
  const st   = f.sourceType ?? 'INDEXED_DB'
  const src  = registry.valueSources?.[st] ?? DEFAULT_VALUE_SOURCES[st] ?? DEFAULT_VALUE_SOURCES.INDEXED_DB
  const base = src({ row, context }) as Row
  if (type === 'COMPUTED') return sel in registry.computeds ? registry.computeds[sel](base) : undefined
  const resolver = registry.selectors?.[type] ?? DEFAULT_SELECTORS[type] ?? DEFAULT_SELECTORS.JSON_PATH
  return resolver(base, sel)
}

function renderField(
  f: TrxField, row: Row, registry: TrxRegistry,
  context: Record<string, string>, setValue: (v: unknown) => void, collection: CollectionApi,
  keyField: string, removeProductRow?: (id: string) => void,
  t?: (key: string, opts?: Record<string, unknown>) => string,
  addProductRow?: (row: Record<string, unknown>) => void,
) {
  const raw = resolveValue(f, row, registry, context)
  const isNum = (v: unknown) => v != null && v !== '' && !Number.isNaN(Number(v))
  const signed = f.negate && isNum(raw) ? Math.abs(Number(raw)) : raw
  const setSigned = f.negate
    ? (v: unknown) => setValue(v === '' || v == null ? v : -Math.abs(Number(v)))
    : setValue
  // `factor`: la columna ve el campo en otra escala (ej. qty en presentaciones) sin dato propio.
  // Sin factor en la fila no hay cómo convertir → solo lectura.
  const factor = f.factor ? Number(row[f.factor]) : 1
  if (f.factor && !factor) return '—'
  const value = f.factor && isNum(signed) ? Math.round((Number(signed) / factor) * 100) / 100 : signed
  const set = f.factor
    ? (v: unknown) => setSigned(v === '' || v == null ? v : Math.round(Number(v) * factor * 1000) / 1000)
    : setSigned
  if (f.renderer && f.renderer in registry.renderers) {
    return registry.renderers[f.renderer]({ value, row, field: f, context, setValue: set, collection, keyField, removeProductRow, t, addProductRow })
  }
  return value == null || value === '' ? '—' : String(value)
}

// Árbol de components armado desde los slots que deja expandFront (filters/main/collection).
// Traduce el shorthand del template (value/unit/input) al TrxField interno.
function normField(f: TrxField): TrxField {
  const out: TrxField = { ...f, selectorValue: f.selectorValue ?? f.value }
  if (out.renderer) return out
  if (f.button) { out.renderer = f.button; return out }   // botón de celda: `button` → renderer
  const unitSub = typeof f.unit === 'string' ? f.unit : 'measurementUnit'   // campo con la unidad (default measurementUnit)
  const isInput = f.type === 'input' || f.input
  const wantsSelect = f.unitType === 'unitSelect'            // input + dropdown de unidad
  const wantsUnit   = f.unitType === 'unit' || (f.unit != null && f.unit !== false)   // unidad fija
  if (isInput && f.money) out.renderer = 'moneyInput'   // input de moneda (absorbe `sign` para negativos)
  else if (isInput && wantsSelect) { out.renderer = 'inputUnitSelect'; out.sub = out.sub ?? unitSub }   // input + selector de unidad (guarda en base)
  else if (isInput && wantsUnit) { out.renderer = 'inputUnit'; out.sub = out.sub ?? unitSub }      // input editable + unidad fija
  else if (isInput && f.sign) out.renderer = 'signedInput'   // input que permite +/- (ajustes)
  else if (f.type)  out.renderer = f.type            // control de celda: input · checkbox · select · text · …
  else if (f.input) out.renderer = 'input'
  else if (wantsUnit) { out.renderer = 'withUnit'; out.sub = out.sub ?? unitSub }   // solo lectura + unidad
  return out
}

// TEMPLATE: arma el árbol de components desde los SLOTS (location/filters/main/collection).
function defaultTree(front: FrontConfig, heading?: string, headingBadge?: string): ComponentNode[] {
  const nodes: ComponentNode[] = []
  const allFilters = front.filters ?? []
  const topFilters = allFilters.filter(f => f.key !== 'category' && f.key !== 'subcategory')
  const categoryFilters = allFilters.filter(f => f.key === 'category' || f.key === 'subcategory')
  if (topFilters.length) nodes.push({ type: 'filters', filters: topFilters })

  // Título de sección estático (page) entre los filtros y la tabla de productos.
  // sin depender de abrir el drawer del carrito (ej. total de la orden en OCM/Factura).
  if (heading) nodes.push({ type: 'heading', title: heading, badge: headingBadge })

  // Tabla principal (slot `main` o legacy `fields`), con field shorthand normalizado.
  const mainTable: ComponentNode = {
    type: 'table', source: front.main?.source ?? 'main',
    title:       front.main?.title ?? 'products',
    rowFilter:   front.main?.rowFilter ?? true,
    placeholder: front.main?.placeholder ?? 'search',
    filterBy:    front.main?.filterBy,
    search:      front.main?.search,
    addSupply:   front.main?.addSupply,
    categoryFilters: categoryFilters.length ? categoryFilters : undefined,
    select:        front.main?.select        ?? front.products?.select,
    dynamicFields: front.main?.dynamicFields ?? front.products?.dynamicFields,
    fields:      (front.main?.fields ?? []).map(normField),
  }

  const coll = front.collection
  if (coll?.display === 'drawer') {
    nodes.push({ ...mainTable, span: 10 })
    nodes.push({ type: 'drawer', trigger: coll.trigger ?? 'finalize', title: coll.title, badge: headingBadge, footerActions: true, children: [
      { type: 'table', source: 'collection', rowKey: coll.rowKey, target: coll.target, fields: coll.fields.map(normField) },
    ] })
  } else if (coll) {
    nodes.push({ type: 'grid', cols: 10, children: [
      { ...mainTable, span: 7 },
      { type: 'table', span: 3, source: 'collection', title: coll.title, rowKey: coll.rowKey, target: coll.target, fields: coll.fields.map(normField) },
    ] })
  } else {
    nodes.push(mainTable)
  }
  return nodes
}

const NO_FETCHER: Fetcher = async () => ({ success: 'false', message: 'sin fetcher', data: [], traceId: null })
// title/subtitle son FIJOS por módulo → los pasa el page (no van en el JSON)
export function TrxRuntime({ config, registry, title, subtitle, heading, headingBadge, trxLabel }: { config: JsonConfig; registry: TrxRegistry; title?: string; subtitle?: string; heading?: string; headingBadge?: string; trxLabel?: string }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'trx' })
  const { JsonREA: rea, JsonWorkflow: workflow } = config
  const front = useMemo(
    () => expandFront(config.JsonFront, !!registry.fetchers.CATEGORIES),
    [config.JsonFront, registry.fetchers.CATEGORIES],
  )
  
  const mainResource = rea.resources.find(r => r.main) ?? rea.resources[0] ?? null
  const filters = useMemo(() => front.filters ?? [], [front])

  const fetcherFor = (r: Resource): Fetcher =>
    r.id in registry.fetchers ? registry.fetchers[r.id] : (r.sourceType === 'API' || r.endpoint ? httpFetcher : NO_FETCHER)

  const [context,        setContext]        = useState<Record<string, string>>(() => initialContext(filters))
  const [fetchedOptions, setFetchedOptions] = useState<Record<string, unknown[]>>({})
  const [selections,     setSelections]     = useState<Record<string, Row[]>>({})
  const [edits,      setEdits]      = useState<Record<string, Record<string, unknown>>>({})
  const [collection, setCollection] = useState<Row[]>([])
  const [extraRows,  setExtraRows]  = useState<Row[]>([])   // filas agregadas a mano (agregar insumo, cargar producto, etc.)
  const [enrichRows, setEnrichRows] = useState<Record<string, Row[]>>({})   // datos de recursos de enriquecimiento (enrichBy), por resource id
  const [state,      setState]      = useState<string>(workflow.initialState)
  const [submitting, setSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)   // bump → re-resuelve resources (refresh de módulo)

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
        const cacheK = `filterOpts::${f.source}`
        try {
          const cached = await getResource<unknown[]>(cacheK)
          if (cached != null) { next[f.key] = Array.isArray(cached) ? cached : []; continue }
          const env  = await registry.fetchers[f.source](f.source, {})
          const data = Array.isArray(env.data) ? env.data : []
          next[f.key] = data
          await saveResource(cacheK, data)
        } catch { next[f.key] = [] }
      }
      if (!cancelled) setFetchedOptions(prev => ({ ...prev, ...next }))
    })()
    return () => { cancelled = true }
  }, [filters, registry])

  // Combos + opción SELECCIONADA por filtro. Cascada: el dependiente saca sus
  // opciones de la opción elegida del padre, en el path `optionsFrom`.
  const { comboOptions, selectedOptions } = useMemo(() => {
    const combo: Record<string, { value: string; label: string }[]> = {}
    const selected: Record<string, unknown> = {}
    for (const f of filters) {
      const data: unknown[] = f.values                                   // combo ESTÁTICO (inline)
        ? f.values
        : f.dependsOn && f.optionsFrom                                   // CASCADA (opción del padre)
          ? ((getValueByPath(selected[f.dependsOn], f.optionsFrom) as unknown[]) ?? [])
          : (fetchedOptions[f.key] ?? [])                               // fetch por source
      const valOf = (o: unknown) =>
        o != null && typeof o === 'object' ? String((o as Record<string, unknown>)[f.optionValue] ?? '') : String(o ?? '')
      const labOf = (o: unknown) =>
        o != null && typeof o === 'object' ? String((o as Record<string, unknown>)[f.optionLabel] ?? '') : String(o ?? '')
      combo[f.key] = data.map(o => ({ value: valOf(o), label: labOf(o) }))
      selected[f.key] = data.find(o => valOf(o) === (context[f.key] ?? ''))
    }
    return { comboOptions: combo, selectedOptions: selected }
  }, [filters, fetchedOptions, context])

  // Context ENRIQUECIDO con valores derivados de los filtros (ej. 'category' -> 'subcategory'), para que los resources se resuelvan con todos los params. 
  const enrichedContext = useMemo(() => {
    const c: Record<string, string> = { ...context }
    for (const d of front.derive ?? []) {
      const fn = registry.computeds[d.compute]
      if (fn) c[d.key] = String(fn({ ...context, $options: selectedOptions } as Record<string, unknown>) ?? '')
    }
    return c
  }, [context, selectedOptions, front, registry])

  
  const resourceFilters = useMemo(() => filters.filter(f => f.resource), [filters])
  const resFiltersKey = useMemo(
    () => resourceFilters.map(f => {
      const r = rea.resources.find(x => x.id === f.resource)
      return r ? `${f.key}:${paramsReady(r, enrichedContext) ? JSON.stringify(resolveParams(r, enrichedContext)) : 'GATED'}` : f.key
    }).join('|'),
    [resourceFilters, rea.resources, enrichedContext],
  )
  useEffect(() => {
    if (!resourceFilters.length) return
    let cancelled = false
    void (async () => {
      for (const f of resourceFilters) {
        const resource = rea.resources.find(r => r.id === f.resource)
        if (!resource) continue
        const set = (data: unknown) => { if (!cancelled) setFetchedOptions(prev => ({ ...prev, [f.key]: Array.isArray(data) ? (data as unknown[]) : [] })) }
        if (!paramsReady(resource, enrichedContext)) { set([]); clearStaleSelection(f, []); continue }
        let data: unknown
        try { data = await resolveResource(resource, enrichedContext, fetcherFor(resource), set) }
        catch { data = [] }
        set(data)
        const list = Array.isArray(data) ? data : []
        clearStaleSelection(f, list)
        if (!cancelled && list.length === 0) {
          const locationLabel = comboOptions.location?.find(o => o.value === enrichedContext.location)?.label ?? enrichedContext.location ?? ''
          toast(t('noOptionsForFilter', { filter: t(f.label), location: locationLabel }), {
            icon: <Info className="h-4 w-4 text-primary" />,
          })
        }
      }
    })()
    return () => { cancelled = true }

    function clearStaleSelection(f: FilterConfig, list: unknown[]) {
      const current = context[f.key]
      if (!current) return
      const valOf = (o: unknown) => (o != null && typeof o === 'object' ? String((o as Record<string, unknown>)[f.optionValue] ?? '') : String(o ?? ''))
      if (list.some(o => valOf(o) === current)) return
      if (cancelled) return
      setContext(c => {
        if (!c[f.key]) return c
        const next = { ...c }
        delete next[f.key]
        for (const other of filters) if (other.dependsOn === f.key) delete next[other.key]
        return next
      })
    }
  }, [resFiltersKey, refreshKey])

  // Recursos de ENRIQUECIMIENTO (enrichBy): fusionan sus filas sobre las del main por una llave.
  // Ej. precio por proveedor (loadproductsbygrower) ← se dispara al elegir proveedor y cruza por idVariety.
  const enrichResources = useMemo(() => rea.resources.filter(r => r.enrichBy), [rea.resources])
  const enrichKey = useMemo(
    () => enrichResources.map(r => `${r.id}:${paramsReady(r, enrichedContext) ? JSON.stringify(resolveParams(r, enrichedContext)) : 'GATED'}`).join('|'),
    [enrichResources, enrichedContext],
  )
  useEffect(() => {
    if (!enrichResources.length) return
    let cancelled = false
    void (async () => {
      for (const r of enrichResources) {
        const set = (data: unknown) => { if (!cancelled) setEnrichRows(prev => ({ ...prev, [r.id]: Array.isArray(data) ? (data as Row[]) : [] })) }
        if (!paramsReady(r, enrichedContext)) { set([]); continue }
        try { set(await resolveResource(r, enrichedContext, fetcherFor(r), set) as Row[]) }
        catch { set([]) }
      }
    })()
    return () => { cancelled = true }
  }, [enrichKey, refreshKey])

  const enrichMap = useMemo(() => {
    const map: Record<string, Row> = {}
    for (const r of enrichResources) {
      const k = r.enrichBy!
      for (const row of enrichRows[r.id] ?? []) { const mk = `${k}::${String(row[k] ?? '')}`; map[mk] = { ...map[mk], ...row } }
    }
    return map
  }, [enrichResources, enrichRows])

  // Campos que aportan los resources de enriquecimiento
  const enrichFieldsRef = useRef(new Set<string>())
  const enrichFields = useMemo(() => {
    for (const r of enrichResources) {
      for (const row of enrichRows[r.id] ?? []) for (const k of Object.keys(row)) if (k !== r.enrichBy) enrichFieldsRef.current.add(k)
    }
    return enrichFieldsRef.current
  }, [enrichResources, enrichRows])

  const applyEnrich = (r: Row): Row => {
    let m = r
    for (const er of enrichResources) { const e = enrichMap[`${er.enrichBy}::${String(r[er.enrichBy!] ?? '')}`]; if (e) m = { ...m, ...e } }
    return m
  }

  const setSelection = (key: string, options: Row[]) => setSelections(s => ({ ...s, [key]: options }))

  // Setea un filtro y RESETEA sus dependientes (cascada).
  const setFilter = (key: string, value: string) => setContext(c => {
    const next = { ...c, [key]: value }
    for (const f of filters) if (f.dependsOn === key) delete next[f.key]
    return next
  })

  const hasFetcher  = !!mainResource && (mainResource.id in registry.fetchers || mainResource.sourceType === 'API' || !!mainResource.endpoint)
  const ready = useMemo(() => !!mainResource && paramsReady(mainResource, enrichedContext), [mainResource, enrichedContext])
  const canFetch    = !!mainResource && ready && hasFetcher
  const mainFetcher = mainResource ? fetcherFor(mainResource) : NO_FETCHER
  const { rows, loading, error } = useTrxData<Row>(canFetch ? mainResource : null, enrichedContext, mainFetcher, refreshKey)
  const retry = () => setRefreshKey(k => k + 1)

  useEffect(() => { if (error) toast.error(t('loadError')) }, [error])

  const hydratedSig = useRef<string>('')

  // Si cambian los params del resource principal (otro documento, otra finca) se vacían, o el total y el create-trx
  // arrastrarían las líneas del anterior.
  const mainParamsKey = mainResource && ready ? JSON.stringify(resolveParams(mainResource, enrichedContext)) : ''
  const prevMainParamsKey = useRef(mainParamsKey)
  useEffect(() => {
    if (prevMainParamsKey.current === mainParamsKey) return
    prevMainParamsKey.current = mainParamsKey
    setCollection([])
    setEdits({})
    setExtraRows([])
    hydratedSig.current = ''
  }, [mainParamsKey])

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
    () => [...rows, ...extraRows].map(r => {
      const m  = applyEnrich(r)
      const id = String(m[keyField] ?? '')
      return edits[id] ? { ...m, ...edits[id] } : m
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, extraRows, enrichResources, enrichMap, edits, keyField],
  )

  // El carrito guarda la fila tal como estaba al agregarla; al leerlo se le quitan los campos de
  // enriquecimiento y se aplican los actuales → cambiar de proveedor re-precia sin perder líneas.
  const effectiveCollection = useMemo(
    () => collection.map(item => {
      const base = enrichFields.size ? Object.fromEntries(Object.entries(item).filter(([k]) => !enrichFields.has(k))) : item
      const m  = applyEnrich(base)
      const id = String(m[collectionKey] ?? '')
      return edits[id] ? { ...m, ...edits[id] } : m
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collection, enrichFields, enrichMap, enrichResources, edits, collectionKey],
  )

  const addProductRow = (row: Row) => setExtraRows(prev => {
    const id = String(row[keyField] ?? '')
    if (prev.some(r => String(r[keyField] ?? '') === id) || rows.some(r => String(r[keyField] ?? '') === id)) return prev
    return [...prev, { ...row, _added: true }]
  })

  const removeProductRow = (id: string) => {
    setExtraRows(prev => prev.filter(r => String(r[keyField] ?? '') !== id))
    setEdits(prev => { const next = { ...prev }; delete next[id]; return next })
    setCollection(prev => prev.filter(r => String(r[collectionKey] ?? '') !== id))
  }

  const collectionApi: CollectionApi = {
    items:  effectiveCollection,
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


  const renderFieldInRow = (f: TrxField, row: Row, kField: string, fromCollection = false): React.ReactNode => {
    const key = f.selectorValue ?? ''
    const id  = String(row[kField] ?? '')
    const setValue = fromCollection
      ? (v: unknown) => {
          collectionApi.update(id, { [key]: v })
          setEdits(prev => ({ ...prev, [id]: { ...prev[id], [key]: v } }))
        }
      : (v: unknown) => {
          setEdits(prev => ({ ...prev, [id]: { ...prev[id], [key]: v } }))
          if (collectionApi.has(id)) collectionApi.update(id, { [key]: v })
        }
    return renderField(f, row, registry, enrichedContext, setValue, collectionApi, kField, removeProductRow, t, addProductRow)
  }

  // Helper de TABLA: convierte fields → columnas de DataTable.
  // Dos columnas pueden leer el mismo campo (ej. qty y presentaciones sobre qty): la key se
  // desambigua con el índice para que DataTable/React no las confundan.
  const fieldKey = (f: TrxField) => f.selectorValue || f.label || f.renderer || ''
  const makeColumns = (fields: TrxField[], kField: string, fromCollection = false): TableColumn<Row>[] =>
    fields.map((f, i) => ({
      key:      fields.findIndex(o => fieldKey(o) === fieldKey(f)) === i ? fieldKey(f) : `${fieldKey(f)}-${i}`,
      header:   f.label ? t(f.label) : '',
      sortable: !f.renderer,
      render:   (row: Row) => renderFieldInRow(f, row, kField, fromCollection),
    }))

  const transitions = workflow.transitions.filter(t => t.from === state)
  const blockReason = (tr: WfTransition): string | null => {
    if (tr.guard) {
      const g = registry.guards?.[tr.guard]
      return g && !g({ rows: effectiveRows, collection: effectiveCollection, context, state }) ? t('cantConfirmHint') : null
    }
    const eventCtx: EventCtx = { front, rows: effectiveRows, collection: effectiveCollection, context: enrichedContext, filters, enrichResources, enrichedContext, state, t }
    const always = registry.events?.HAS_ITEMS?.(eventCtx)
    if (always) return always
    for (const name of front.event ?? []) {
      const reason = registry.events?.[name]?.(eventCtx)
      if (reason) return reason
    }
    return null
  }
  // 'submitting' cuenta como bloqueo: mientras haya un create-trx en vuelo, canFire da false y
  // el botón se deshabilita solo (mismo mecanismo que cualquier otro motivo)
  const canFire = (tr: WfTransition) => !submitting && blockReason(tr) === null
  const fire = async (tr: WfTransition) => {
    if (!canFire(tr)) return
    setSubmitting(true)
    // enrichedContext incluye los DERIVADOS (skuPrefix, EmailSupplier…)
    const args = { rows: effectiveRows, collection: effectiveCollection, context: enrichedContext, state, config, clearCollection: () => setCollection([]), transition: tr, trxLabel, t, registry }

    // create-trx es INTRÍNSECO y debe tener ÉXITO para resetear/transicionar. Si falla,
    // salimos SIN tocar nada → el pedido (carrito + cantidades) queda intacto para reintentar.
    try {
      try {
        if ('createTrx' in registry.actions) await registry.actions.createTrx(args)
      } catch {
        return
      }

      // ── SOLO en éxito ── reset del módulo: vacía carrito + cantidades tecleadas, transiciona
      // y refresca la data (cache invalidada).
      setCollection([])
      setEdits({})
      setExtraRows([])   // limpia las filas agregadas a mano (catálogo) tras crear
      setContext(() => initialContext(filters))
      setState(tr.to)
      for (const r of rea.resources) if (r.cacheIn) await clearResourcePrefix(r.id)
      setRefreshKey(k => k + 1)
      // Estado destino TERMINAL (sin salidas) → auto-reset al inicial (listo para otra TRX).
      if (!workflow.transitions.some(x => x.from === tr.to)) setState(workflow.initialState)

      const events = Array.isArray(tr.event) ? tr.event : tr.event ? [tr.event] : []
      for (const ev of events) {
        if (ev in registry.actions) {
          void Promise.resolve(registry.actions[ev](args)).catch(err => {
            console.error(`[TRX] evento "${ev}" falló`, err)
            toast.warning(t('eventFailed', { event: ev }))
          })
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── SDUI: cada componente se dibuja por `type` (registry override > default) ──
  const renderNode = (node: ComponentNode, key: Key): React.ReactNode => {
    const comp = registry.components?.[node.type] ?? DEFAULT_COMPONENTS[node.type]
    return comp ? <Fragment key={key}>{comp(node, ctx)}</Fragment> : null
  }

  const ctx: RuntimeCtx = {
    t,
    front, rows: effectiveRows, loading, ready, error, retry, collection: collectionApi, addProductRow, removeProductRow,
    // enrichedContext (no el crudo): incluye los DERIVADOS (skuPrefix…) que el filterBy de la tabla necesita para filtrar correctamente.
    context: enrichedContext, setContext, setFilter, options: comboOptions, filterData: fetchedOptions, selections, setSelection, locked,
    state, transitions, fire, canFire, blockReason, submitting,
    makeColumns, renderField: (f, row) => renderFieldInRow(f, row, keyField),
    keyField, registry, renderNode,
  }

  const components = defaultTree(front, heading, headingBadge)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(title ?? front.title ?? config.prefix)}</h1>
        {(subtitle ?? front.subtitle) && <p className="mt-1 text-sm text-muted-foreground">{t(subtitle ?? front.subtitle ?? '')}</p>}
      </div>

      {/* refreshKey en la key → tras confirmar, remonta el árbol (resetea inputs con estado
          local, ej. cantidad+unidad). El context/filtros viven en este componente → persisten. */}
      {components.map((node, i) => renderNode(node, `${refreshKey}-${i}`))}

      {front.collection?.display !== 'drawer' && transitions.some(tr => tr.label) && (
        <div className="flex flex-wrap items-start justify-end gap-2">
          {transitions.filter(tr => tr.label).map((tr, i) => {
            const reason = blockReason(tr)
            return (
              <div key={tr.label ?? i} className="flex flex-col items-end gap-1">
                <Button variant={tr.variant ?? 'default'} onClick={() => fire(tr)} disabled={!canFire(tr)}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t(tr.label ?? '')}
                </Button>
                {/* Neutro, no destructive: "falta completar X" es guía, no un error — el rojo
                    se ve como que algo salió mal apenas se entra al módulo. */}
                {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
