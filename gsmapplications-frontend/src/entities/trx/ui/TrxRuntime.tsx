import { Fragment, useEffect, useMemo, useRef, useState, type Key } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { MapPin, Info, Loader2 } from 'lucide-react'
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
function resolveValue(f: TrxField, row: Row, registry: TrxRegistry, context: Record<string, string>): unknown {
  const type = f.selectorType ?? 'JSON_PATH'
  const sel  = f.selectorValue ?? ''
  // sourceType elige el BASE (fila · context · cookie · …); el path navega desde ahí.
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
  // `negate`: el usuario ve/edita en POSITIVO, pero el valor se GUARDA negado (ej. gasto 90 → -90).
  // createTrx lo lleva tal cual (genérico). Display = abs · al setear = -abs. Sirve para cualquier input.
  const value = f.negate && raw != null && raw !== '' && !Number.isNaN(Number(raw)) ? Math.abs(Number(raw)) : raw
  const set = f.negate
    ? (v: unknown) => setValue(v === '' || v == null ? v : -Math.abs(Number(v)))
    : setValue
  if (f.renderer && f.renderer in registry.renderers) {
    return registry.renderers[f.renderer]({ value, row, field: f, context, setValue: set, collection, keyField, removeProductRow, t, addProductRow })
  }
  return value == null || value === '' ? '—' : String(value)
}

// Si el JSON no trae `components`, se arma una lista plana desde items/collection.
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
// Reusa el render existente. Si el config trae `components`, ese path gana (backward-compat).
function defaultTree(front: FrontConfig, heading?: string, headingBadge?: string): ComponentNode[] {
  const nodes: ComponentNode[] = []

  // Filtros: el template ya dejó la ubicación FIJA como filters[0] + los variables. Categoría/
  // subcategoría (key 'category'/'subcategory', las inyecta expandFront si el módulo tiene
  // CATEGORIES) NO van en esta barra — se renderizan DENTRO de la tabla (panel colapsable),
  // sin importar si llegaron por la inyección automática o por el `"filter"` deprecado.
  const allFilters = front.filters ?? []
  const topFilters = allFilters.filter(f => f.key !== 'category' && f.key !== 'subcategory')
  const categoryFilters = allFilters.filter(f => f.key === 'category' || f.key === 'subcategory')
  if (topFilters.length) nodes.push({ type: 'filters', filters: topFilters })

  // Título de sección estático (page) entre los filtros y la tabla de productos. `headingBadge`
  // (opcional, prop del módulo — no JSON): id de un computed que arma un total visible siempre,
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
    // Multi-select + columnas comparativas (ej. proveedores/precio). El template NO los
    // propaga (son específicos de una TRX); acá se leen del slot products/main que los declara.
    select:        front.main?.select        ?? front.products?.select,
    dynamicFields: front.main?.dynamicFields ?? front.products?.dynamicFields,
    fields:      (front.main?.fields ?? front.fields ?? []).map(normField),
  }

  const coll = front.collection
  if (coll?.display === 'drawer') {
    // Carrito en DRAWER: tabla principal full-width + drawer con la collection.
    nodes.push({ ...mainTable, span: 10 })
    nodes.push({ type: 'drawer', trigger: coll.trigger ?? 'finalize', title: coll.title, footerActions: true, children: [
      { type: 'table', source: 'collection', title: coll.title, rowKey: coll.rowKey, target: coll.target, fields: coll.fields.map(normField) },
    ] })
  } else if (coll) {
    // Carrito INLINE (default): grid 70/30.
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

/**
 * Renderiza un módulo entero desde su JsonConfig: JsonFront (SDUI: components →
 * registry.components, layout DENTRO del componente) + JsonREA (data por resource,
 * cache IndexedDB) + JsonWorkflow (FSM → estado + botones). La UI reusa shared/ui.
 */
// title/subtitle son FIJOS por módulo → los pasa el page (no van en el JSON). A futuro
// salen de i18n/ruta. Fallback al JSON legacy (front.title) y al prefix.
export function TrxRuntime({ config, registry, title, subtitle, heading, headingBadge, trxLabel }: { config: JsonConfig; registry: TrxRegistry; title?: string; subtitle?: string; heading?: string; headingBadge?: string; trxLabel?: string }) {
  // i18n: traduce labels por su texto (keyPrefix 'trx'). Si no hay traducción, devuelve el
  // propio texto (los labels del JSON van en inglés → sirve de fallback y de key).
  const { t } = useTranslation(undefined, { keyPrefix: 'trx' })
  const { JsonREA: rea, JsonWorkflow: workflow } = config
  // El template expande el JsonFront mínimo (filter/products/cart) a la forma interna
  // (location gate + filters + derive + main/collection). Todo lo demás lee de acá.
  // `hasCategories`: mismo criterio que "Cargar insumo" (CATALOG) — si el módulo registra
  // CATEGORIES, la cascada categoría/subcategoría se inyecta sola (ver expandFront).
  const front = useMemo(
    () => expandFront(config.JsonFront, !!registry.fetchers.CATEGORIES),
    [config.JsonFront, registry.fetchers.CATEGORIES],
  )
  // Tabla principal: resource marcado `main:true` (explícito, sin depender del orden) o resources[0] (fallback).
  const mainResource = rea.resources.find(r => r.main) ?? rea.resources[0] ?? null
  const filters = useMemo(() => getFilters(front), [front])

  // Elige el fetcher de un resource: custom por id (registry) → httpFetcher (API/endpoint) → none.
  // Único para la tabla principal y los combos-desde-resource (mismo resolver de datos).
  const fetcherFor = (r: Resource): Fetcher =>
    r.id in registry.fetchers ? registry.fetchers[r.id] : (r.sourceType === 'API' || r.endpoint ? httpFetcher : NO_FETCHER)

  const [context,        setContext]        = useState<Record<string, string>>(() => initialContext(filters))
  const [fetchedOptions, setFetchedOptions] = useState<Record<string, unknown[]>>({})
  const [selections,     setSelections]     = useState<Record<string, Row[]>>({})
  const [edits,      setEdits]      = useState<Record<string, Record<string, unknown>>>({})
  const [collection, setCollection] = useState<Row[]>([])
  const [extraRows,  setExtraRows]  = useState<Row[]>([])   // filas agregadas a mano (ej. "cargar insumo" del catálogo)
  const [enrichRows, setEnrichRows] = useState<Record<string, Row[]>>({})   // datos de recursos de enriquecimiento (enrichBy), por resource id
  const [state,      setState]      = useState<string>(workflow.initialState)
  // Bug real reportado: sin esto, un doble-click mientras createTrx todavía está en vuelo
  // dispara DOS create-trx (canFire no mira si ya hay una petición en curso). El botón se
  // deshabilita solo (vía canFire) mientras dure.
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
        // Opciones semi-estáticas (fincas/categorías) → cache IndexedDB por source. Evita
        // re-pedirlas en cada entrada al módulo; se comparten entre TRX que usan el mismo source.
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
      // MERGE (no replace): preserva las opciones de los combos-desde-resource, que los
      // llena el otro efecto (params del context) y no deben pisarse acá.
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
      // Opción PRIMITIVA (string/number, ej. LOADMISSINGTRX → List<string>): value=label=el valor.
      // Opción OBJETO: se leen optionValue/optionLabel.
      const valOf = (o: unknown) =>
        o != null && typeof o === 'object' ? String((o as Record<string, unknown>)[f.optionValue] ?? '') : String(o ?? '')
      const labOf = (o: unknown) =>
        o != null && typeof o === 'object' ? String((o as Record<string, unknown>)[f.optionLabel] ?? '') : String(o ?? '')
      combo[f.key] = data.map(o => ({ value: valOf(o), label: labOf(o) }))
      selected[f.key] = data.find(o => valOf(o) === (context[f.key] ?? ''))
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

  // Combos-desde-resource: opciones desde un resource (JsonREA) con params del context + gate.
  // Ej. Requerimiento ← LOADMISSINGTRX(location, origen, destino). Se re-resuelve SOLO cuando
  // cambian los params del combo (no todo el context). Al elegir, su value entra al context →
  // dispara el resource principal (líneas). SWR: el 4º arg de resolveResource revalida en bg.
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
        // Gate: sin los params completos (ej. falta location) → sin opciones (limpia lo previo).
        // Sin toast acá: todavía no es "no hay resultados", es "faltan filtros".
        if (!paramsReady(resource, enrichedContext)) { set([]); continue }
        let data: unknown
        try { data = await resolveResource(resource, enrichedContext, fetcherFor(resource), set) }
        catch { data = [] }
        set(data)
        // Efecto solo re-corre cuando resFiltersKey cambia (params de ESTE resource) → un
        // toast por combinación real de filtros elegida, no en cada render.
        if (!cancelled && Array.isArray(data) && data.length === 0) {
          const locationLabel = comboOptions.location?.find(o => o.value === enrichedContext.location)?.label ?? enrichedContext.location ?? ''
          // `text-primary` → var(--primary): sigue el color del TENANT activo (TenantProvider lo
          // pisa en runtime), no un color fijo. Solo el ícono — sin borde de acento (se ve
          // genérico/IA, look "side-tab").
          toast(t('noOptionsForFilter', { filter: t(f.label), location: locationLabel }), {
            icon: <Info className="h-4 w-4 text-primary" />,
          })
        }
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resFiltersKey, refreshKey])

  // Recursos de ENRIQUECIMIENTO (enrichBy): fusionan sus filas sobre las del main por una llave.
  // Ej. precio por proveedor (loadproductsbygrower) ← se dispara al elegir proveedor y cruza por idVariety.
  // Se cargan igual que los combos-desde-resource (gate + params del context); su data se merge-a en effectiveRows.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichKey, refreshKey])

  // Mapa de enriquecimiento: `${enrichBy}::${valor}` → campos a fusionar en la fila del main.
  const enrichMap = useMemo(() => {
    const map: Record<string, Row> = {}
    for (const r of enrichResources) {
      const k = r.enrichBy!
      for (const row of enrichRows[r.id] ?? []) { const mk = `${k}::${String(row[k] ?? '')}`; map[mk] = { ...map[mk], ...row } }
    }
    return map
  }, [enrichResources, enrichRows])

  const setSelection = (key: string, options: Row[]) => setSelections(s => ({ ...s, [key]: options }))

  // Setea un filtro y RESETEA sus dependientes (cascada).
  const setFilter = (key: string, value: string) => setContext(c => {
    const next = { ...c, [key]: value }
    for (const f of filters) if (f.dependsOn === key) delete next[f.key]
    return next
  })

  const hasFetcher  = !!mainResource && (mainResource.id in registry.fetchers || mainResource.sourceType === 'API' || !!mainResource.endpoint)
  // GATE: no fetchea hasta que los params que el recurso saca del CONTEXT (location…) tengan
  // valor. Sin finca no se pide nada (evita la llamada vacía/con error al entrar sin ubicación).
  const ready = useMemo(() => !!mainResource && paramsReady(mainResource, enrichedContext), [mainResource, enrichedContext])
  const canFetch    = !!mainResource && ready && hasFetcher
  const mainFetcher = mainResource ? fetcherFor(mainResource) : NO_FETCHER
  const { rows, loading, error } = useTrxData<Row>(canFetch ? mainResource : null, enrichedContext, mainFetcher, refreshKey)
  const retry = () => setRefreshKey(k => k + 1)

  // Fallo de data (LOADCS): además del inline "Reintentar" en la tabla, un toast (la trx en sí
  // no se tocó; es solo la carga de stock). No reintenta solo — el usuario decide.
  useEffect(() => { if (error) toast.error(t('loadError')) }, [error])   // eslint-disable-line react-hooks/exhaustive-deps

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

  // La tabla principal = filas del resource (LOADCS) + filas agregadas a mano (catálogo),
  // con la edición inline aplicada por encima (edits).
  const effectiveRows = useMemo(
    () => [...rows, ...extraRows].map(r => {
      // enriquecimiento: fusiona los campos de los resources `enrichBy` por su llave (ej. precio por idVariety)
      let m = r
      for (const er of enrichResources) { const e = enrichMap[`${er.enrichBy}::${String(r[er.enrichBy!] ?? '')}`]; if (e) m = { ...m, ...e } }
      const id = String(m[keyField] ?? '')
      return edits[id] ? { ...m, ...edits[id] } : m
    }),
    [rows, extraRows, enrichResources, enrichMap, edits, keyField],
  )

  // Agrega una fila EXTRA a la tabla (ej. "cargar insumo"). Dedupe contra el resource y las ya
  // agregadas. `_added` → la marca para que el filtro por prefijo NO la oculte (se agregó a propósito).
  const addProductRow = (row: Row) => setExtraRows(prev => {
    const id = String(row[keyField] ?? '')
    if (prev.some(r => String(r[keyField] ?? '') === id) || rows.some(r => String(r[keyField] ?? '') === id)) return prev
    return [...prev, { ...row, _added: true }]
  })

  // Quita una fila AGREGADA a mano (por si el usuario se equivocó) + limpia su edición.
  const removeProductRow = (id: string) => {
    setExtraRows(prev => prev.filter(r => String(r[keyField] ?? '') !== id))
    setEdits(prev => { const next = { ...prev }; delete next[id]; return next })
  }

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
  // SINCRONIZADO en los dos sentidos mientras la fila esté en AMBOS lados (ya agregada al
  // carrito): editar en products también actualiza su copia en el carrito, y viceversa —
  // si no, quedan como dos copias independientes (snapshot al momento del +) y editar
  // cualquiera de las dos no se refleja en la otra, que es confuso.
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
  const makeColumns = (fields: TrxField[], kField: string, fromCollection = false): TableColumn<Row>[] =>
    fields.map(f => ({
      key:      f.selectorValue || f.label || f.renderer || '',
      header:   f.label ? t(f.label) : '',
      sortable: !f.renderer,
      render:   (row: Row) => renderFieldInRow(f, row, kField, fromCollection),
    }))

  // ── Workflow (FSM) ──
  const transitions = workflow.transitions.filter(t => t.from === state)
  // Un solo cálculo: blockReason recorre los eventos (custom por `guard`, o `registry.events`)
  // y devuelve el PRIMER motivo que encuentra; canFire es simplemente "¿no hay motivo?". Antes
  // eran 2 funciones con la misma lista de checks copiada dos veces (bool vs texto) — cualquier
  // regla nueva había que agregarla en las dos, y ahí se desincronizaban.
  const blockReason = (tr: WfTransition): string | null => {
    if (tr.guard) {
      const g = registry.guards?.[tr.guard]
      return g && !g({ rows: effectiveRows, collection, context, state }) ? t('cantConfirmHint') : null
    }
    // `context: enrichedContext` (no el crudo) — así un `required` sobre un valor DERIVADO (ej.
    // EmailSupplier, calculado vía `derive`) se ve acá igual que cualquier otro.
    const eventCtx: EventCtx = { front, rows: effectiveRows, collection, context: enrichedContext, filters, enrichResources, enrichedContext, state, t }
    // HAS_ITEMS corre SIEMPRE, sin declararlo — toda TRX necesita ≥1 línea. El resto (built-in
    // u custom del módulo) SOLO corre si `front.event` lo lista explícito — así el JSON dice a
    // simple vista qué se valida, en vez de quedar implícito en un paquete default oculto.
    const always = registry.events?.HAS_ITEMS?.(eventCtx)
    if (always) return always
    for (const name of front.event ?? []) {
      const reason = registry.events?.[name]?.(eventCtx)
      if (reason) return reason
    }
    return null
  }
  // `submitting` cuenta como bloqueo: mientras haya un create-trx en vuelo, canFire da false y
  // el botón se deshabilita solo (mismo mecanismo que cualquier otro motivo) — sin esto, un
  // segundo click antes de que responda el backend disparaba OTRO create-trx (bug real: doble
  // click → dos transacciones idénticas creadas).
  const canFire = (tr: WfTransition) => !submitting && blockReason(tr) === null
  // `tr` (no `t`) para no tapar el `t` de i18n → el createTrx lo usa para el toast traducido.
  const fire = async (tr: WfTransition) => {
    if (!canFire(tr)) return
    setSubmitting(true)
    // enrichedContext (no el context crudo): incluye los DERIVADOS (skuPrefix, EmailSupplier…)
    // — antes esto pasaba el crudo, así que un `derive` nunca le llegaba a createTrx/eventos y
    // había que resolverlo a mano con un override de acción. Un solo context completo en todos lados.
    const args = { rows: effectiveRows, collection, context: enrichedContext, state, config, clearCollection: () => setCollection([]), transition: tr, trxLabel, t, registry }

    // create-trx es INTRÍNSECO y debe tener ÉXITO para resetear/transicionar. Si falla,
    // salimos SIN tocar nada → el pedido (carrito + cantidades) queda intacto para reintentar.
    try {
      try {
        if ('createTrx' in registry.actions) await registry.actions.createTrx(args)
      } catch {
        return
      }

      // ── SOLO en éxito ── reset del módulo: vacía carrito + cantidades tecleadas, transiciona
      // y refresca la data (cache invalidada). El árbol se remonta por refreshKey (resetea inputs).
      setCollection([])
      setEdits({})
      setExtraRows([])   // limpia las filas agregadas a mano (catálogo) tras crear
      // Resetea TODOS los filtros (ubicación incluida) — es una TRX nueva, no continuación de la
      // anterior. Si el usuario tiene finca fija por cookie, initialContext ya la vuelve a poner sola.
      setContext(() => initialContext(filters))
      setState(tr.to)
      for (const r of rea.resources) if (r.cacheIn) await clearResourcePrefix(r.id)
      setRefreshKey(k => k + 1)
      // Estado destino TERMINAL (sin salidas) → auto-reset al inicial (listo para otra TRX).
      if (!workflow.transitions.some(x => x.from === tr.to)) setState(workflow.initialState)

      // `event` = efecto(s) post-success (ej. ADJUST_INVENTORY, SEND_EMAIL). El backend los corre
      // como parte del workflow (el front lee el response para avisar fallos). Acá solo se disparan
      // los que EXISTAN como registry.actions (override de front), fire-and-forget. Uno o varios.
      const events = Array.isArray(tr.event) ? tr.event : tr.event ? [tr.event] : []
      for (const ev of events) {
        if (ev in registry.actions) void Promise.resolve(registry.actions[ev](args)).catch(() => {})
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
    // enrichedContext (no el crudo): incluye los DERIVADOS (skuPrefix…) que el filterBy
    // de la tabla necesita para filtrar por prefijo. setContext/setFilter siguen tocando el crudo.
    context: enrichedContext, setContext, setFilter, options: comboOptions, filterData: fetchedOptions, selections, setSelection, locked,
    state, transitions, fire, canFire, blockReason, submitting,
    makeColumns, renderField: (f, row) => renderFieldInRow(f, row, keyField),
    keyField, registry, renderNode,
  }

  const components = front.components ?? defaultTree(front, heading, headingBadge)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(title ?? front.title ?? config.prefix)}</h1>
          {(subtitle ?? front.subtitle) && <p className="mt-1 text-sm text-muted-foreground">{t(subtitle ?? front.subtitle ?? '')}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(() => {
            const hb = front.headerBadge ? registry.computeds[front.headerBadge]?.(enrichedContext) : null
            if (!hb) return null   // sin badge de estado por defecto
            return (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {String(hb)}
              </span>
            )
          })()}
        </div>
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
