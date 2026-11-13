import type { ReactNode, Key } from 'react'
import type { TableColumn } from '@/shared/ui/data-table'
import type { Resource, ReaConfig } from './types'
import type { Fetcher } from './engine'
import type { ValueSourceCtx } from './valueSources'

export interface TrxField {
  label?:        string      // etiqueta (header de columna). Omitible (ej. columna de botón)
  selectorValue?: string     // el valor/path a extraer. Omitible si es solo `renderer` (botón)
  selectorType?: string      // cómo se extrae → registry.selectors (default JSON_PATH)
  source?:       string      // id del resource (de cuál dataset)
  sourceType?:   string      // dónde está (INDEXED_DB · API · MEMORY)
  renderer?:     string      // cómo se dibuja el valor → registry.renderers
  sub?:          string      // path acompañante (sub-texto de 2 líneas · clave de tono/estado)
  value?:        string             // alias corto de selectorValue
  unit?:         boolean | string   // → renderer withUnit (true = campo estándar 'measurementUnit')
  input?:        boolean            // → renderer input (editable)
  type?:         string             // control de la celda → renderer (input · checkbox · select · …)
  button?:       string             // botón de celda → renderer (addButton · removeButton · …); key declarativa
  values?:       { value: string; label: string }[]   // opciones INLINE (select/checkbox estáticos, sin source)
  unitType?:     'unit' | 'unitSelect'  // 'unit' = unidad fija · 'unitSelect' = input + dropdown de unidad (guarda en base)
  sign?:         boolean            // input que permite +/- (ajustes); si no, solo positivos
  negate?:       boolean            // qty: el usuario teclea positivo, se GUARDA negado (ej. gasto: 90 → -90)
  money?:        boolean            // → input de moneda ($ del tenant); guarda número plano, formatea solo display
  sendToTrx?:    boolean            // products: default true (false = SOLO-UI, ej. "rejected") · summary: default false (true = se manda). Va en trxProductAttributes. Mismo patrón que `addSupply` (opt-out explícito, no hace falta tocar actions.ts por cada columna nueva)
  hidden?:       boolean            // no se dibuja, pero sigue en las columns → se manda igual que si se viera (ver sendToTrx)
  factor?:       string             // campo de la fila (ej. presentationQty): se MUESTRA selectorValue ÷ factor y lo digitado se escribe × factor. Solo visual, no guarda nada propio
  defaultFrom?:  string             // campo de la fila (ej. saldo) con el que ARRANCA el valor; lo digitado gana. Tooltip al enfocar con el valor que reemplazó
  required?:     boolean
}

/** Un filtro/selector que alimenta el context (params del resource). */
export interface FilterConfig {
  key:            string
  label:          string
  source?:        string   // fetcher de opciones (filtros base; los dependientes no lo usan)
  resource?:      string   // id de un resource (JsonREA) → las opciones salen de ESE resource (params resueltos del context, con gate). Alternativa a `source` (fetcher sin params): sirve para combos que dependen de otros filtros (ej. Requerimiento ← location/origen/destino).
  values?:        { value: string; label: string }[]   // opciones INLINE (combo ESTÁTICO, sin source)
  optionValue:    string
  optionLabel:    string
  cookieDefault?: { field: string }   // default (y bloqueo) desde la cookie del usuario
  lookup?:        boolean             // ver AttributeSpec.lookup
  dependsOn?:     string   // CASCADA: depende de la selección de otro filtro
  optionsFrom?:   string   // path en la OPCIÓN elegida del padre (ej. "Children")
  input?:         'text' | 'date'   // 'text' = input libre · 'date' = date picker (no combo)
  placeholder?:   string   // placeholder del input/combo
  required?:      boolean  // sin valor, el motor bloquea las transiciones (evento REQUIRED_FILTERS, ver canFire/blockReason)
  section?:       string
}

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
  title:    string
  fields:   TrxField[]
  rowKey?:  string
  target?:  string
  display?: 'inline' | 'drawer'   // cómo se muestra el carrito (default: inline)
  trigger?: string                // label del botón que abre el drawer (si display=drawer)
}

export interface SelectConfig { key: string; label: string; source: string; optionValue: string; optionLabel: string }
export interface DynamicFieldsConfig { from: string; label: string; selector: string; pick?: string }

/** Slot de la tabla principal (template). El transformer lo vuelve un component `table`. */
export interface MainSlot {
  source?:      string
  title?:       string
  placeholder?: string
  rowFilter?:   boolean
  filterBy?:    { field: string; prefixFrom: string }
  search?:      SearchConfig
  addSupply?:   boolean   // false → oculta el picker "cargar insumo" (ej. gasto: se consume del stock, no se agrega)
  select?:      SelectConfig          // multi-select del toolbar (ej. proveedores)
  dynamicFields?: DynamicFieldsConfig  // comparativa: 1 columna por opción elegida
  fields:       TrxField[]
}

export interface AttributeSpec {
  key:          string
  label?:       string
  resource?:    string
  source?:      string
  values?:      { value: string; label: string }[]
  input?:       'text' | 'date'
  compute?:     string  
  optionValue?: string
  optionLabel?: string
  required?:    boolean
  placeholder?: string
  section?:     string   // agrupa en la FiltersBar — ver FilterConfig.section (mismo nombre/default)
  lookup?:      boolean  // con `resource`: botón para buscar y cargar un documento que ya no sale en el combo (el tipo sale del `trxPrefixRelative` del resource)
}

/** Slot tabla principal — forma MÍNIMA: solo `columns` (el resto lo pone el template). */
export interface ProductsSlot {
  source?:      string
  columns:      TrxField[]
  placeholder?: string
  rowFilter?:   boolean
  filterBy?:    { field: string; prefixFrom: string }
  search?:      SearchConfig
  addSupply?:   boolean   // false → oculta el picker "cargar insumo"
  select?:      SelectConfig          // multi-select del toolbar (ej. proveedores) — específico de una TRX, NO va por el template
  dynamicFields?: DynamicFieldsConfig  // comparativa: 1 columna por opción elegida (ej. precio por proveedor)
}

export interface SummarySlot {
  title?:   string
  columns?: TrxField[]
  target?:  string
  rowKey?:  string
  display?: 'inline' | 'drawer'
  trigger?: string
}

export interface ItemsSlots {
  products?: ProductsSlot
  summary?:    SummarySlot | false   // false = sin carrito: `products` ES la transacción completa (ej. RPI/VFI)
}

/** JsonFront: qué se ve. `components` = lista PLANA de componentes por `type`. */
export interface FrontConfig {
  title?:      string
  subtitle?:   string
  rowKey?:     string
  derive?:         { key: string; compute: string }[]   // context DERIVADO (registry.computeds con $options)
  initCollection?: string              // hidrata la collection con las filas de un resource (ej. "main")
  trxAttributes?:  AttributeSpec[]
  validations?: {
    sign?:     string     // qué campo (selectorValue) permite +/- — igual que el `sign` viejo de TrxField, ahora acá
    negate?:   string     // qué campo se guarda negado (tipea positivo, se guarda negativo) — igual que el `negate` viejo
    required?: string[]   // keys que no pueden quedar vacías EN TODA fila — de `trxAttributes`/filtros (revisa REQUIRED_ATTRIBUTES) o de columnas de products/summary por `selectorValue` (revisa REQUIRED_FIELDS, por fila)
    when?: Record<string, string>
    voidZeroQty?: boolean
  }
  event?:          string[]
  lookup?:         boolean   // módulos de catálogo: botón para buscar una transacción del mismo tipo del módulo y cargar sus cantidades como plantilla. En módulos con combo de documento va en el atributo (AttributeSpec.lookup)
  // ── Forma MÍNIMA (el template `expandFront` la expande a location/filters/main/collection) ──
  items?:      ItemsSlots           // agrupa lo visual (products/cart); también se acepta plano
  products?:   ProductsSlot        // tabla principal (solo `columns`)
  summary?:    SummarySlot | false   // resumen/carrito (`columns` + `title`); false = sin carrito
  // ── SLOTS internos: los arma expandFront, NO van en el JSON ──
  main?:       MainSlot            // slot de la tabla principal
  filters?:    FilterConfig[]      // location + trxAttributes con control + categoría
  collection?: CollectionSection   // slot carrito (inline/drawer)
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
  categoryFilters?: FilterConfig[]   // categoría/subcategoría del `table` — panel "Filtros" colapsable DENTRO de la tabla, no en la barra de arriba
  apply?:    string            // label del botón "Aplicar Filtros": estaciona los valores y confirma (en vez de auto-aplicar)
  expand?:   string            // renderer (registry) para una fila full-width debajo (ej. comentario de rechazo)
  badge?:    string            // computed (registry) → texto del badge del `heading` (ej. contador de pendientes)
  text?:     string            // texto del componente `note`
  optionValue?: string        // para `search` (combo de catálogo)
  optionLabel?: string
  placeholder?: string
  search?:   SearchConfig     // buscador/picker en el toolbar de la tabla
  select?:   { key: string; label: string; source: string; optionValue: string; optionLabel: string }  // multi-select en el toolbar → ctx.selections[key]
  rowFilter?: boolean         // buscador que filtra las filas de la tabla por texto
  filterBy?:  { field: string; prefixFrom: string }   // filtro cliente: fila entra si row[field] empieza con context[prefixFrom]
  titleField?: string         // campo que titula cada card de `reviewList`
  when?:       string         // computed que filtra qué filas entran a `reviewList` (truthy = incluir)
  emptyText?:  string         // texto cuando `reviewList` está vacío
  trigger?:    string         // label del botón que abre el `drawer`
  dynamicFields?: { from: string; label: string; selector: string; pick?: string }
  cols?:     number           // para `grid` (grid-cols-N, default 10)
  span?:     number           // ancho del hijo en el grid (col-span)
  children?: ComponentNode[]  // para layout CSS (grid/stack)
  [key: string]: unknown
}

/** Una transición de la FSM (JsonWorkflow) — lógica pura, sin UI. */
export interface WfTransition {
  from:     string
  to:       string
  label?:   string      // texto del botón que GENERA esta transición (sin label → no hay botón, ej. auto)
  variant?: 'default' | 'secondary' | 'ghost'
  event?:   string | string[]   // efecto(s) post-success. El backend ejecuta los del workflow; el front corre SOLO los que existan en registry.actions (uno o varios).
  guard?:   string      // precondición → registry.guards[guard]  (FSM/UI)
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
  keyField:   string     // rowKey configurado → identidad de la fila (no asumir 'id')
  removeProductRow?: (id: string) => void   // quita una fila AGREGADA a mano (`_added`) de la tabla
  addProductRow?: (row: Record<string, unknown>) => void   // agrega una fila EXTRA a la tabla principal (mismo canal que "cargar insumo")
  t?:         (key: string, opts?: Record<string, unknown>) => string   // i18n (keyPrefix 'trx') — para mensajes del renderer (ej. validación)
}

export interface ActionCtx {
  rows:            Record<string, unknown>[]
  collection:      Record<string, unknown>[]
  context:         Record<string, string>
  state:           string           // estado actual de la FSM
  config:          JsonConfig
  clearCollection: () => void       // vaciar el carrito (ej. al iniciar un nuevo pedido)
  transition?:     WfTransition     // la transición disparada (from/to → trxStates)
  trxLabel?:       string           // key i18n del módulo para el toast (ej. "requirement", "adjustment")
  t:               (key: string, opts?: Record<string, unknown>) => string   // i18n (keyPrefix 'trx') → toast traducido
  registry:        TrxRegistry      // para resolver columnas COMPUTED (ej. priceQty) al armar trxProductAttributes — no están en la fila, solo en registry.computeds
}

/** Contexto para evaluar un guard (precondición de transición, custom por `WfTransition.guard`). */
export interface GuardCtx {
  rows:       Record<string, unknown>[]
  collection: Record<string, unknown>[]
  context:    Record<string, string>
  state:      string
}

export interface EventCtx {
  front:       FrontConfig
  rows:        Record<string, unknown>[]
  collection:  Record<string, unknown>[]
  context:     Record<string, string>
  filters:     FilterConfig[]
  enrichResources: Resource[]
  enrichedContext: Record<string, string>
  state:       string
  t:           (key: string, opts?: Record<string, unknown>) => string
}

export interface TrxRegistry {
  fetchers:    Record<string, Fetcher>
  computeds:   Record<string, (row: Record<string, unknown>) => unknown>
  renderers:   Record<string, (ctx: CellRenderCtx) => ReactNode>   // cómo renderizar un valor
  selectors?:  Record<string, (data: unknown, selectorValue: string) => unknown>   // buscadores por selectorType (override/extiende DEFAULT_SELECTORS)
  valueSources?: Record<string, (c: ValueSourceCtx) => unknown>                      // base por sourceType (override/extiende DEFAULT_VALUE_SOURCES)
  actions:     Record<string, (ctx: ActionCtx) => void | Promise<void>>
  guards?:     Record<string, (ctx: GuardCtx) => boolean>                            // preconditions FSM (custom por transición, vía `guard`)
  events?:     Record<string, (ctx: EventCtx) => string | null>                      // validaciones que gatean confirmar, por nombre (vía `FrontConfig.event`)
  components?: Record<string, (node: ComponentNode, ctx: RuntimeCtx) => ReactNode>  // SDUI custom
}

/** Estado + helpers que el runtime le pasa a cada componente SDUI para renderizar. */
export interface RuntimeCtx {
  t:           (key: string, opts?: Record<string, unknown>) => string   // i18n: traduce un label (keyPrefix 'trx'; fallback = el propio texto). `opts` para interpolación/pluralización (ej. count).
  front:       FrontConfig
  rows:        Record<string, unknown>[]   // filas del resource principal (con ediciones)
  loading:     boolean
  ready:       boolean                     // gate: ¿los filtros que el recurso pide (location…) están completos? Si no, no se fetchea.
  error:       unknown                     // error del fetch del recurso principal (null si ok)
  retry:       () => void                  // re-dispara el fetch del recurso (para el "Reintentar")
  collection:  CollectionApi
  addProductRow: (row: Record<string, unknown>) => void   // agrega una fila EXTRA a la tabla (ej. "cargar insumo" del catálogo)
  removeProductRow: (id: string) => void   // quita una fila EXTRA (`_added`) de la tabla — contraparte de addProductRow
  context:     Record<string, string>
  setContext:  (updater: (c: Record<string, string>) => Record<string, string>) => void
  setFilter:   (key: string, value: string) => void   // setea un filtro y resetea sus dependientes (cascada)
  options:     Record<string, { value: string; label: string }[]>
  filterData:  Record<string, unknown[]>                          // data CRUDA de los filtros ya traída (ej. categorías con Children) → reusable por pickers, sin re-fetch
  selections:  Record<string, Record<string, unknown>[]>          // selecciones MÚLTIPLES (multi-select → columnas/acciones derivadas)
  setSelection: (key: string, options: Record<string, unknown>[]) => void
  locked:      Set<string>
  lookupPrefix: string                              // tipo de documento del lookup ('' = el módulo no tiene)
  lookupFixed: boolean                              // true = lookup en un combo (tipo fijo) · false = en la raíz (plantilla, tipo del módulo)
  lookup:      (trxDocument: string, location?: string) => void   // combo: carga el documento aunque ya no salga en su lista · raíz: copia sus cantidades
  state:       string
  transitions: WfTransition[]
  fire:        (t: WfTransition) => void
  canFire:     (t: WfTransition) => boolean
  blockReason: (t: WfTransition) => string | null   // motivo (texto YA traducido) de por qué canFire da false — null si sí se puede
  submitting:  boolean                              // true mientras un createTrx está en vuelo — spinner en el botón de confirmar
  makeColumns:  (fields: TrxField[], keyField: string, fromCollection?: boolean) => TableColumn<Record<string, unknown>>[]  // helper tabla
  renderField:  (field: TrxField, row: Record<string, unknown>) => ReactNode                       // genérico (card/…)
  keyField:    string
  registry:    TrxRegistry
  renderNode:  (node: ComponentNode, key: Key) => ReactNode
}

// Re-export por conveniencia del consumidor.
export type { Resource }
