// Runtime declarativo: el JsonConfig es el objeto UNIFICADO (front + rea + workflow)
// que el motor renderiza. Mapea 1:1 con las columnas JsonFront/JsonREA/JsonWorkflow
// de la tabla TrxDefinition. La lógica no declarable vive en el registry (por id).
import type { ReactNode, Key } from 'react'
import type { TableColumn } from '@/shared/ui/data-table'
import type { Resource, ReaConfig } from './types'
import type { Fetcher } from './engine'

/** Descriptor GENÉRICO de un campo de datos — lo consume CUALQUIER componente
 *  (tabla → columna · card → label-valor · lista → item · KPI → valor). */
/** Descriptor de un campo — formato del backend (solo `descr`→`label`). El motor
 *  lo interpreta genérico; cada atributo es configurable desde el JSON. */
export interface TrxField {
  label:         string      // etiqueta (header de columna / label de campo) — era `descr`
  selectorValue: string      // el valor/path a extraer
  selectorType?: string      // cómo se extrae → registry.selectors (default JSON_PATH)
  source?:       string      // id del resource (de cuál dataset)
  sourceType?:   string      // dónde está (INDEXED_DB · API · MEMORY)
  renderer?:     string      // cómo se dibuja el valor → registry.renderers
  sub?:          string      // path acompañante (sub-texto de 2 líneas · clave de tono/estado)
}

/** Un filtro/selector que alimenta el context (params del resource). */
export interface FilterConfig {
  key:            string
  label:          string
  source?:        string   // fetcher de opciones (filtros base; los dependientes no lo usan)
  optionValue:    string
  optionLabel:    string
  cookieDefault?: { field: string }   // default (y bloqueo) desde la cookie del usuario
  dependsOn?:     string   // CASCADA: depende de la selección de otro filtro
  optionsFrom?:   string   // path en la OPCIÓN elegida del padre (ej. "Children")
  input?:         'text'   // si es 'text', el filtro es un input libre (no combo)
  placeholder?:   string   // placeholder del input/combo
}

/** Buscador de catálogo del toolbar. Con `cascade` se vuelve un PICKER: botón +
 *  popover con filtros categoría→subcategoría + lista filtrada (como Requirements). */
export interface SearchConfig {
  source:       string
  optionValue?: string
  optionLabel?: string
  placeholder?: string
  label?:       string          // texto del botón trigger (cuando hay cascade)
  cascade?:     FilterConfig[]  // filtros en cascada dentro del popover
  prefixFrom?:  string          // path en la opción elegida → prefijo (ej. AggregatedCode)
  prefixField?: string          // campo del producto a comparar con el prefijo (default 'sku')
}

/** 2ª tabla (carrito/pedido). `target` = balde del payload al enviar (trxProducts…). */
export interface CollectionSection {
  title:   string
  fields:  TrxField[]
  rowKey?: string
  target?: string
}

/** JsonFront: qué se ve. `components` = lista PLANA de componentes por `type`. */
export interface FrontConfig {
  title?:      string
  subtitle?:   string
  rowKey?:     string
  components?:     ComponentNode[]     // SDUI: lista plana (los filtros van en un `filters`)
  derive?:         { key: string; compute: string }[]   // context DERIVADO (registry.computeds con $options)
  initCollection?: string              // hidrata la collection con las filas de un resource (ej. "main")
  headerBadge?:    string              // computed (registry) → badge del header (ej. finca del usuario)
  headerButtons?:  WfButton[]          // botones de workflow en el header (arriba a la derecha)
  filters?:    FilterConfig[]      // legacy (si no hay un component `filters`)
  fields?:     TrxField[]          // legacy
  collection?: CollectionSection   // legacy
}

/** Sección de tabla (para componentes compuestos como `picker`). */
export interface TableSection {
  title?:   string
  fields:   TrxField[]
  rowKey?:  string
  target?:  string          // balde del payload (trxProducts…)
}

/** Un componente de UI (lista PLANA). `type` → registry.components[type]. El
 *  layout/responsive vive DENTRO del componente, no en el JSON (sin span/children). */
export interface ComponentNode {
  type:     string
  source?:   string           // 'main' | 'collection' | (futuro) resource id
  title?:    string
  fields?:   TrxField[]        // campos de datos (los consume table/card/…)
  rowKey?:   string
  target?:   string
  filters?:  FilterConfig[]    // para el component `filters` (self-contained)
  apply?:    string            // label del botón "Aplicar Filtros": estaciona los valores y confirma (en vez de auto-aplicar)
  expand?:   string            // renderer (registry) para una fila full-width debajo (ej. comentario de rechazo)
  badge?:    string            // computed (registry) → texto del badge del `heading` (ej. contador de pendientes)
  text?:     string            // texto del componente `note`
  buttons?:  WfButton[]        // para `actions` (label + on)
  align?:    'start' | 'center' | 'end'   // alineación de `actions` (default: apilado w-full)
  optionValue?: string        // para `search` (combo de catálogo)
  optionLabel?: string
  placeholder?: string
  search?:   SearchConfig     // buscador/picker en el toolbar de la tabla
  select?:   { key: string; label: string; source: string; optionValue: string; optionLabel: string }  // multi-select en el toolbar → ctx.selections[key]
  rowFilter?: boolean         // buscador que filtra las filas de la tabla por texto
  titleField?: string         // campo que titula cada card de `reviewList`
  when?:       string         // computed que filtra qué filas entran a `reviewList` (truthy = incluir)
  emptyText?:  string         // texto cuando `reviewList` está vacío
  trigger?:    string         // label del botón que abre el `drawer`
  // Columnas DERIVADAS de una selección múltiple (comparativa): 1 columna por opción
  // elegida. `selector` = computed llamado con { ...row, $opt: opción }. `label` es
  // una plantilla con tokens de la opción, ej. 'Precio {short}'.
  // `pick` = campo de la fila donde se guarda la opción ELEGIDA (botón +): habilita
  // escoger 1 columna por fila (comparar y elegir precio/proveedor).
  dynamicFields?: { from: string; label: string; selector: string; pick?: string }
  cols?:     number           // para `grid` (grid-cols-N, default 10)
  span?:     number           // ancho del hijo en el grid (col-span)
  children?: ComponentNode[]  // para layout CSS (grid/stack)
  [key: string]: unknown
}

/** Una transición de la FSM (JsonWorkflow) — lógica pura, sin UI. */
export interface WfTransition {
  from:   string
  to:     string
  on:     string      // evento que dispara (lo emite un botón del front)
  event?: string      // side-effect → registry.actions[event]
  guard?: string      // precondición → registry.guards[guard]  (FSM, no UI)
}

/** Botón del front (JsonFront): su label + qué evento (`on`) emite. */
export interface WfButton {
  on:       string
  label:    string
  variant?: 'default' | 'secondary' | 'ghost'
}

/** JsonWorkflow: la máquina de estados. */
export interface WorkflowConfig {
  initialState: string
  states:       string[]
  transitions:  WfTransition[]
}

/** El config unificado que consume el runtime. `serie`/IdTrxDefinition son del
 *  backend; el front solo necesita `prefix` (→ trxPrefix del payload). El id de
 *  datos vive en cada resource (JsonREA.resources[].id → el dispatch). */
export interface JsonConfig {
  prefix:       string             // Prefix — marca de la transacción (→ payload) + key del cache
  JsonFront:    FrontConfig         // columna JsonFront
  JsonREA:      ReaConfig           // columna JsonREA  { resources, events, agents }
  JsonWorkflow: WorkflowConfig      // columna JsonWorkflow
}

// ── Registry: lo que el JSON no puede expresar, por id ──────────────

export interface CollectionApi {
  items:  Record<string, unknown>[]
  add:    (row: Record<string, unknown>) => void
  remove: (id: string) => void
  update: (id: string, patch: Record<string, unknown>) => void   // parchea una fila (edición inline · elegir opción)
  has:    (id: string) => boolean
}

export interface CellRenderCtx {
  value:      unknown
  row:        Record<string, unknown>
  field:      TrxField
  context:    Record<string, string>
  setValue:   (v: unknown) => void
  collection: CollectionApi
}

export interface ActionCtx {
  rows:            Record<string, unknown>[]
  collection:      Record<string, unknown>[]
  context:         Record<string, string>
  state:           string           // estado actual de la FSM
  config:          JsonConfig
  clearCollection: () => void       // vaciar el carrito (ej. al iniciar un nuevo pedido)
}

/** Contexto para evaluar un guard (precondición de transición). */
export interface GuardCtx {
  rows:       Record<string, unknown>[]
  collection: Record<string, unknown>[]
  context:    Record<string, string>
  state:      string
}

export interface TrxRegistry {
  fetchers:    Record<string, Fetcher>
  computeds:   Record<string, (row: Record<string, unknown>) => unknown>
  renderers:   Record<string, (ctx: CellRenderCtx) => ReactNode>   // cómo renderizar un valor
  selectors?:  Record<string, (data: unknown, selectorValue: string) => unknown>   // buscadores por selectorType (override/extiende DEFAULT_SELECTORS)
  actions:     Record<string, (ctx: ActionCtx) => void>
  guards?:     Record<string, (ctx: GuardCtx) => boolean>                            // preconditions FSM
  components?: Record<string, (node: ComponentNode, ctx: RuntimeCtx) => ReactNode>  // SDUI custom
}

/** Estado + helpers que el runtime le pasa a cada componente SDUI para renderizar. */
export interface RuntimeCtx {
  front:       FrontConfig
  rows:        Record<string, unknown>[]   // filas del resource principal (con ediciones)
  loading:     boolean
  collection:  CollectionApi
  context:     Record<string, string>
  setContext:  (updater: (c: Record<string, string>) => Record<string, string>) => void
  setFilter:   (key: string, value: string) => void   // setea un filtro y resetea sus dependientes (cascada)
  options:     Record<string, { value: string; label: string }[]>
  selections:  Record<string, Record<string, unknown>[]>          // selecciones MÚLTIPLES (multi-select → columnas/acciones derivadas)
  setSelection: (key: string, options: Record<string, unknown>[]) => void
  locked:      Set<string>
  state:       string
  transitions: WfTransition[]
  transitionFor: (on: string) => WfTransition | undefined   // transición saliente por evento
  fire:        (t: WfTransition) => void
  canFire:     (t: WfTransition) => boolean
  makeColumns:  (fields: TrxField[], keyField: string, fromCollection?: boolean) => TableColumn<Record<string, unknown>>[]  // helper tabla
  renderField:  (field: TrxField, row: Record<string, unknown>) => ReactNode                       // genérico (card/…)
  keyField:    string
  registry:    TrxRegistry
  renderNode:  (node: ComponentNode, key: Key) => ReactNode
}

// Re-export por conveniencia del consumidor.
export type { Resource }
